export const routes = {
  auth: {
    login: '/(auth)/login',
    register: '/(auth)/register',
    onboarding: '/(auth)/onboarding',
  },
  tabs: {
    home: '/(tabs)/home',
    search: '/(tabs)/search',
    chat: '/(tabs)/chat',
    konto: '/(tabs)/konto',
  },
  listings: {
    view: (id: string) => `/listings/${id}`,
    create: '/listings/create',
    edit: {
      homeLocation: '/listings/edit/home-location',
      responsibilities: '/listings/edit/responsibilities',
      sittersReviews: '/listings/edit/sitters-reviews',
      welcomeGuide: '/listings/edit/welcome-guide',
    },
  },
  bookings: {
    list: '/bookings',
    view: (id: string) => `/bookings/${id}`,
    new: '/bookings/new',
  },
} as const;
