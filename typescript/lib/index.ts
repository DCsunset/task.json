import { Task, TaskJson, TaskType } from "../index";
import { DateTime } from "luxon";
import * as _ from "lodash";
export * from "./type.guard";

export function initTaskJson(): TaskJson {
	return {
		todo: [],
		done: [],
		removed: []
	};
}

export function uuidToIndex(taskJson: TaskJson, type: TaskType, uuids: string[]): number[] {
	const uuidSet = new Set(uuids);
	const indexes: number[] = [];

	taskJson[type].forEach((task, index) => {
		if (uuidSet.has(task.uuid)) {
			indexes.push(index);
		}
	});
	return indexes;
}

export function removeTasks(taskJson: TaskJson, type: TaskType, indexes: number[]) {
	const date = new Date().toISOString();
	const removedTasks = _.remove(taskJson[type], (_, index) => indexes.includes(index))
		.map(task => {
			task.modified = date;
			return task;
		});
	taskJson.removed.push(...removedTasks);
}

export function doTasks(taskJson: TaskJson, indexes: number[]) {
	const date = new Date().toISOString();
	const doneTasks = _.remove(taskJson.todo, (_, index) => indexes.includes(index))
		.map(task => {
			task.end = date;
			task.modified = date;
			return task;
		});
	taskJson.done.push(...doneTasks);
}

export function undoTasks(taskJson: TaskJson, type: "removed" | "done", indexes: number[]) {
	const date = new Date().toISOString();
	const undoneTasks = _.remove(taskJson[type], (_, index) => indexes.includes(index))
		.map(task => {
			task.modified = date;
			return task;
		});
	const doneTasks = undoneTasks.filter(task => type === "removed" && task.end);
	const todoTasks = undoneTasks.filter(task => type === "done" || !task.end);
	todoTasks.forEach(task => {
		delete task.end;
		return task;
	});
	taskJson.todo.push(...todoTasks);
	taskJson.done.push(...doneTasks);
}

export function mergeTaskJson(...taskJsons: TaskJson[]): TaskJson {
	const tasks: Map<string, {
		type: TaskType,
		task: Task
	}> = new Map();
	const types: TaskType[] = ["todo", "done", "removed"];

	for (const type of types) {
		for (const taskJson of taskJsons) {
			for (const task of taskJson[type]) {
				if (tasks.has(task.uuid)) {
					// Compare timestamp
					const current = DateTime.fromISO(task.modified);
					const existing = DateTime.fromISO(tasks.get(task.uuid)!.task.modified);

					// Update tasks only if current > existing
					if (current <= existing)
						continue;
				}

				tasks.set(task.uuid, { type, task });
			}
		}
	}

	const result = initTaskJson();
	for (const { type, task } of tasks.values()) {
		result[type].push(task);
	}

	// Sort tasks by start date
	for (const type of types) {
		result[type].sort((left, right) => {
			const startLeft = DateTime.fromISO(left.start);
			const startRight = DateTime.fromISO(right.start);
			return startLeft < startRight ? -1 : 1;
		});
	}

	return result;
}
