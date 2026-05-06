import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { authAPI, modulesAPI, notificationsAPI, messagesAPI } from '../api/client.js';

// ─── AUTH STORE ───────────────────────────────
export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const response = await authAPI.login(email, password);
          const { user, accessToken, refreshToken } = response.data;
          localStorage.setItem('nexuserp_token', accessToken);
          localStorage.setItem('nexuserp_refresh_token', refreshToken);
          set({
            user,
            token: accessToken,
            refreshToken,
            isAuthenticated: true,
            isLoading: false,
          });
          return { success: true };
        } catch (error) {
          set({ isLoading: false });
          return { success: false, error: error.message };
        }
      },

      register: async (data) => {
        set({ isLoading: true });
        try {
          const res = await authAPI.register(data);
          set({ isLoading: false });
          return { success: true, pending: res.pending ?? false, message: res.message };
        } catch (error) {
          set({ isLoading: false });
          return { success: false, error: error.message };
        }
      },

      logout: async () => {
        try { await authAPI.logout(); } catch (_) {}
        localStorage.removeItem('nexuserp_token');
        localStorage.removeItem('nexuserp_refresh_token');
        set({ user: null, token: null, refreshToken: null, isAuthenticated: false });
      },

      // ✅ fetchMe ne déconnecte PLUS en cas d'erreur
      fetchMe: async () => {
        try {
          const token = localStorage.getItem('nexuserp_token');
          if (!token) return;
          const response = await authAPI.me();
          if (response?.data) {
            set({ user: response.data, isAuthenticated: true });
          }
        } catch (err) {
          // ✅ On ne déconnecte PAS — on garde l'état actuel
          console.warn('fetchMe failed, keeping current session');
        }
      },
    }),
    {
      name: 'nexuserp-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

// ─── THEME STORE ──────────────────────────────
export const useThemeStore = create(
  persist(
    (set) => ({
      theme: 'dark',
      toggleTheme: () => set((s) => {
        const next = s.theme === 'dark' ? 'light' : 'dark';
        document.documentElement.setAttribute('data-theme', next);
        return { theme: next };
      }),
      applyTheme: (theme) => {
        document.documentElement.setAttribute('data-theme', theme);
      },
    }),
    { name: 'nexuserp-theme', partialize: (s) => ({ theme: s.theme }) }
  )
);

// ─── MODULES STORE ────────────────────────────
export const useModulesStore = create((set, get) => ({
  modules: [],
  isLoading: false,

  fetchModules: async () => {
    set({ isLoading: true });
    try {
      const response = await modulesAPI.getAll();
      if (response?.data) {
        set({ modules: response.data, isLoading: false });
      }
    } catch (_) {
      set({ isLoading: false });
    }
  },

  toggleModule: async (moduleId) => {
    try {
      const response = await modulesAPI.toggle(moduleId);
      const { enabled } = response.data;
      set((state) => ({
        modules: state.modules.map((m) =>
          m.id === moduleId ? { ...m, enabled } : m
        ),
      }));
      return { success: true, enabled };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  toggleSubmodule: async (submoduleId) => {
    try {
      const response = await modulesAPI.toggleSubmodule(submoduleId);
      const { enabled } = response.data;
      set((state) => ({
        modules: state.modules.map((mod) => ({
          ...mod,
          subModules: (mod.subModules || []).map((s) =>
            s.id === submoduleId ? { ...s, enabled } : s
          ),
        })),
      }));
      return { success: true, enabled };
    } catch (error) {
      return { success: false, error: error.message };
    }
  },

  reorderModules: async (newOrder) => {
    // Optimistic update
    set((state) => ({
      modules: state.modules.map((m) => {
        const found = newOrder.find((o) => o.id === m.id);
        return found ? { ...m, sortOrder: found.sortOrder } : m;
      }),
    }));
    try {
      await modulesAPI.reorder(newOrder);
    } catch (_) {
      get().fetchModules();
    }
  },

  applyRemoteToggle: (moduleId, enabled) => {
    set((state) => ({
      modules: state.modules.map((m) =>
        m.id === moduleId ? { ...m, enabled } : m
      ),
    }));
  },

  getEnabledModules: () => get().modules.filter((m) => m.enabled),
  isModuleEnabled: (slug) =>
    get().modules.find((m) => m.slug === slug)?.enabled ?? false,
}));

// ─── NOTIFICATIONS STORE ──────────────────────
export const useNotificationsStore = create((set) => ({
  notifications: [],
  unreadCount: 0,

  fetchNotifications: async () => {
    try {
      const response = await notificationsAPI.getAll();
      if (response?.data) {
        const notifications = response.data;
        set({
          notifications,
          unreadCount: notifications.filter((n) => !n.isRead).length,
        });
      }
    } catch (_) {}
  },

  addNotification: (notification) => {
    set((state) => ({
      notifications: [notification, ...state.notifications],
      unreadCount: state.unreadCount + 1,
    }));
  },

  markAllRead: async () => {
    try {
      await notificationsAPI.markAllRead();
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
        unreadCount: 0,
      }));
    } catch (_) {}
  },
}));

// ─── MESSAGES STORE ───────────────────────────
export const useMessagesStore = create((set) => ({
  conversations: [],
  activeThread: [],
  activeUserId: null,
  typingUsers: {},

  fetchConversations: async () => {
    try {
      const response = await messagesAPI.getConversations();
      if (response?.data) {
        set({ conversations: response.data });
      }
    } catch (_) {}
  },

  openThread: async (userId) => {
    set({ activeUserId: userId });
    try {
      const response = await messagesAPI.getThread(userId);
      if (response?.data) {
        set({ activeThread: response.data });
      }
    } catch (_) {}
  },

  addMessage: (message) => {
    set((state) => {
      const isActive =
        state.activeUserId === message.senderId ||
        state.activeUserId === message.receiverId;
      return {
        activeThread: isActive
          ? [...state.activeThread, message]
          : state.activeThread,
      };
    });
  },

  setTyping: (userId, isTyping) => {
    set((state) => ({
      typingUsers: { ...state.typingUsers, [userId]: isTyping },
    }));
  },
}));
