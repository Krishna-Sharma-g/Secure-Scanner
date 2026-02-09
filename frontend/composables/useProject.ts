interface ProjectState {
  currentProjectId: string | null;
}

const projectState = reactive<ProjectState>({
  currentProjectId: null,
});

export const useProject = () => {
  const init = () => {
    if (import.meta.client) {
      projectState.currentProjectId = localStorage.getItem('ss_project_id');
    }
  };

  const setCurrentProject = (id: string | null) => {
    projectState.currentProjectId = id;
    if (import.meta.client) {
      if (id) {
        localStorage.setItem('ss_project_id', id);
      } else {
        localStorage.removeItem('ss_project_id');
      }
    }
  };

  return {
    currentProjectId: computed(() => projectState.currentProjectId),
    init,
    setCurrentProject,
  };
};
