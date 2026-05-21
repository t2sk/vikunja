<template>
	<div class="team-gantt">
		<h1>{{ team?.name || $t('team.title') }} — {{ $t('project.gantt.title') }}</h1>
		<Message
			v-if="isInvalidTeamId"
			variant="danger"
			class="mb-4"
		>
			{{ $t('misc.invalidId') }}
		</Message>
		<Message
			v-else
			variant="info"
			class="mb-4"
		>
			{{ $t('team.gantt.readOnlyNotice') }}
		</Message>
		<Card :has-content="false">
			<div class="gantt-options">
				<FormField :label="$t('project.gantt.range')">
					<Foo
						id="range"
						v-model="flatPickerDateRange"
						:config="flatPickerConfig"
						class="input"
						:placeholder="$t('project.gantt.range')"
					/>
				</FormField>
			</div>
		</Card>

		<Card :has-content="false" :padding="false" class="has-overflow team-gantt-readonly">
			<GanttChart
				:filters="filters"
				:tasks="tasks"
				:is-loading="isLoading"
				:default-task-start-date="defaultTaskStartDate"
				:default-task-end-date="defaultTaskEndDate"
			/>
		</Card>
	</div>
</template>

<script setup lang="ts">
import {computed, ref, shallowReactive, onMounted} from 'vue'
import type Flatpickr from 'flatpickr'
import {useI18n} from 'vue-i18n'
import {useRoute} from 'vue-router'
import Foo from '@/components/misc/flatpickr/Flatpickr.vue'
import FormField from '@/components/input/FormField.vue'
import GanttChart from '@/components/gantt/GanttChart.vue'
import Message from '@/components/misc/Message.vue'
import TeamService from '@/services/team'
import TeamProjectsService from '@/services/teamProjects'
import TaskService from '@/services/task'
import {isoToKebabDate} from '@/helpers/time/isoToKebabDate'
import type {DateISO} from '@/types/DateISO'
import type {ITeam} from '@/modelTypes/ITeam'
import type {ITask} from '@/modelTypes/ITask'

type Options = Flatpickr.Options.Options
const route = useRoute()
const teamId = computed(() => Number(route.params.id))
const isInvalidTeamId = computed(() => Number.isNaN(teamId.value) || teamId.value <= 0)
const team = ref<ITeam | null>(null)
const tasks = ref<Map<number, ITask>>(new Map())
const isLoading = ref(false)
const projectIds = ref<number[]>([])
const teamService = shallowReactive(new TeamService())
const teamProjectsService = shallowReactive(new TeamProjectsService())
const taskService = shallowReactive(new TaskService())

const DEFAULT_DATE_RANGE_DAYS = 7
const today = new Date()
const defaultTaskStartDate: DateISO = new Date(today.setHours(0, 0, 0, 0)).toISOString()
const defaultTaskEndDate: DateISO = new Date(new Date(today.getFullYear(), today.getMonth(), today.getDate() + DEFAULT_DATE_RANGE_DAYS).setHours(23, 59, 0, 0)).toISOString()
const dateFrom = ref(new Date(today.getFullYear(), today.getMonth(), today.getDate() - 15).toISOString())
const dateTo = ref(new Date(today.getFullYear(), today.getMonth(), today.getDate() + 55).toISOString())

const filters = computed(() => ({
	projectId: 0,
	viewId: 0,
	dateFrom: dateFrom.value,
	dateTo: dateTo.value,
	showTasksWithoutDates: false,
}))

async function loadTasks() {
	if (projectIds.value.length === 0) {
		tasks.value = new Map()
		return
	}
	isLoading.value = true
	try {
		const loadedTasks = await taskService.getAll(undefined, {
			sort_by: ['start_date', 'done', 'id'],
			order_by: ['asc', 'asc', 'desc'],
			filter: `((start_date >= "${isoToKebabDate(dateFrom.value)}" && start_date <= "${isoToKebabDate(dateTo.value)}") || (end_date >= "${isoToKebabDate(dateFrom.value)}" && end_date <= "${isoToKebabDate(dateTo.value)}") || (due_date >= "${isoToKebabDate(dateFrom.value)}" && due_date <= "${isoToKebabDate(dateTo.value)}") || (start_date <= "${isoToKebabDate(dateFrom.value)}" && end_date >= "${isoToKebabDate(dateTo.value)}"))`,
			filter_include_nulls: false,
			project_ids: projectIds.value,
			expand: 'subtasks',
		}) as ITask[]
		tasks.value = new Map()
		loadedTasks.forEach(t => tasks.value.set(t.id, t))
	} finally {
		isLoading.value = false
	}
}

onMounted(async () => {
	if (isInvalidTeamId.value) {
		return
	}

	team.value = await teamService.get({id: teamId.value})
	const projects = await teamProjectsService.getAll({teamId: teamId.value})
	projectIds.value = projects.map(p => p.id)
	await loadTasks()
})

const flatPickerDateRange = computed<Date[]>({
	get: () => ([new Date(dateFrom.value), new Date(dateTo.value)]),
	set(newVal) {
		const [newFrom, newTo] = newVal.map((date) => date?.toISOString())
		if (!newTo) return
		dateFrom.value = newFrom
		dateTo.value = newTo
		void loadTasks()
	},
})
const {t} = useI18n({useScope: 'global'})
const flatPickerConfig = computed(() => ({
	altFormat: t('date.altFormatShort'),
	altInput: true,
	defaultDate: [dateFrom.value, dateTo.value],
	enableTime: false,
	mode: 'range',
} as Options))
</script>

<style scoped lang="scss">
.team-gantt-readonly :deep(.gantt-chart) {
	pointer-events: none;
}
</style>
