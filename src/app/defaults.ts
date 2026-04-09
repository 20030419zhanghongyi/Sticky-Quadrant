import type { StickyTask } from '../types/sticky';

export const DEFAULT_STICKY_TASKS: StickyTask[] = [
  { id: 1, text: '左键展开工作区', completed: false, progressMark: 0 },
  { id: 2, text: '右键打开控制菜单', completed: false, progressMark: 0 },
  { id: 3, text: '回车生成任务卡片', completed: false, progressMark: 0 },
  { id: 4, text: '拖动完成优先部署', completed: false, progressMark: 0 },
  { id: 5, text: '涂抹即可标记进度', completed: false, progressMark: 0 },
  { id: 6, text: '作者：张二本', completed: false, progressMark: 0 },
  { id: 7, text: '邮箱：20030419zhanghongyi@gmail.com', completed: false, progressMark: 0 }
];

export const INITIAL_NEXT_TASK_ID = 8;
export const FULLSCREEN_STABILIZE_DELAY_MS = 300;
export const PERSISTENCE_SAVE_DELAY_MS = 350;
