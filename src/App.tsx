import ExpandedWorkspace from './components/ExpandedWorkspace';
import StickyWidget from './components/StickyWidget';
import { useStickyQuadrantState } from './app/useStickyQuadrantState';

function App() {
  const { state, actions } = useStickyQuadrantState();

  return (
    <main className="app-root">
      {state.isExpanded ? (
        <ExpandedWorkspace
          onClose={actions.exitExpanded}
          onFinalize={actions.finalizeTasks}
          onTaskDelete={actions.completeTask}
          cards={state.workspaceCards}
          onCardsChange={actions.setWorkspaceCards}
          allocateTaskId={actions.allocateTaskId}
        />
      ) : null}
      {!state.isEnteringExpanded ? (
        <StickyWidget
          displayMode={state.displayMode}
          ghostTheme={state.ghostTheme}
          isExpanded={state.isExpanded}
          onBookmarkClick={actions.enterExpanded}
          onDisplayModeChange={actions.setDisplayMode}
          onGhostThemeChange={actions.setGhostTheme}
          tasks={state.stickyTasks}
          onTaskComplete={actions.completeTask}
          onTaskProgressChange={actions.updateTaskProgress}
        />
      ) : null}
    </main>
  );
}

export default App;
