import AbstractService from './abstractService'
import ProjectModel from '@/models/project'
import type {IProject} from '@/modelTypes/IProject'

export default class TeamProjectsService extends AbstractService<IProject> {
	constructor() {
		super({
			getAll: '/teams/{teamId}/projects',
		})
	}

	modelFactory(data) {
		return new ProjectModel(data)
	}
}
