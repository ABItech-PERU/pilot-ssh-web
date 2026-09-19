import { Navigate, Outlet, type RouteObject } from 'react-router'

import { AvisoDeAmbiente } from '@/components/aviso-de-ambiente'
import { LoadingScreen } from '@/components/states'
import { GuestLayout } from '@/layouts/GuestLayout'
import { PublicLayout } from '@/layouts/PublicLayout'
import { PrivacyPage } from '@/features/legal/PrivacyPage'
import { TermsPage } from '@/features/legal/TermsPage'
import { LandingPage } from '@/features/sitio/LandingPage'
import { PricingPage } from '@/features/sitio/PricingPage'
import { SecurityPage } from '@/features/sitio/SecurityPage'
import { ErrorPage } from '@/pages/ErrorPage'
import { NotFoundPage } from '@/pages/NotFoundPage'
import { RequireAuth, RequireGuest, RequirePlatformStaff } from '@/routes/guards'

/** Panel con carga diferida: la landing no descarga terminal, tablas ni
 *  formularios del área privada. */
export const rutas: RouteObject[] = [
  {
    // Raíz: todo fallo cae en ErrorPage, no en blanco. En pruebas, el aviso
    // de ambiente va arriba de todo
    element: (
      <>
        <AvisoDeAmbiente />
        <Outlet />
      </>
    ),
    errorElement: <ErrorPage />,
    // Mientras se descarga la primera pantalla diferida: sin blanco ni aviso
    // en consola
    hydrateFallbackElement: <LoadingScreen />,
    children: [
      {
        // Sin carga diferida: prerenderizadas, no deben parpadear
        element: <PublicLayout />,
        children: [
          { index: true, element: <LandingPage /> },
          { path: 'pricing', element: <PricingPage /> },
          { path: 'security', element: <SecurityPage /> },
          { path: 'terms', element: <TermsPage /> },
          { path: 'privacy', element: <PrivacyPage /> },
        ],
      },

      {
        // Sin guard: la invitación se lee con o sin sesión
        element: <GuestLayout />,
        children: [
          {
            path: 'invitations/:token',
            lazy: async () => ({
              Component: (await import('@/features/members/AcceptInvitationPage'))
                .AcceptInvitationPage,
            }),
          },
        ],
      },

      {
        element: <RequireGuest />,
        children: [
          {
            element: <GuestLayout />,
            children: [
              {
                path: 'login',
                lazy: async () => ({
                  Component: (await import('@/features/auth/LoginPage')).LoginPage,
                }),
              },
              {
                path: 'register',
                lazy: async () => ({
                  Component: (await import('@/features/auth/RegisterPage')).RegisterPage,
                }),
              },
              {
                path: 'forgot-password',
                lazy: async () => ({
                  Component: (await import('@/features/auth/ForgotPasswordPage'))
                    .ForgotPasswordPage,
                }),
              },
              {
                path: 'reset-password',
                lazy: async () => ({
                  Component: (await import('@/features/auth/ResetPasswordPage'))
                    .ResetPasswordPage,
                }),
              },
            ],
          },
        ],
      },

      {
        element: <RequireAuth />,
        children: [
          {
            path: 'onboarding',
            lazy: async () => ({
              Component: (await import('@/features/auth/OnboardingPage')).OnboardingPage,
            }),
          },
          {
            // Fuera del AppLayout: la terminal ocupa la pantalla entera
            path: 'app/servers/:serverId/terminal',
            lazy: async () => ({
              Component: (await import('@/features/terminal/TerminalPage')).TerminalPage,
            }),
          },
          {
            // Panel del personal: armazón propio, sin selector de organización
            element: <RequirePlatformStaff />,
            children: [
              {
                path: 'backoffice',
                lazy: async () => ({
                  Component: (await import('@/layouts/PlatformLayout')).PlatformLayout,
                }),
                children: [
                  {
                    index: true,
                    lazy: async () => ({
                      Component: (
                        await import('@/features/backoffice/PlatformSummaryPage')
                      ).PlatformSummaryPage,
                    }),
                  },
                  {
                    path: 'organizations',
                    lazy: async () => ({
                      Component: (
                        await import('@/features/backoffice/PlatformOrganizationsPage')
                      ).PlatformOrganizationsPage,
                    }),
                  },
                  {
                    // Caso de un cliente: pestañas como rutas hijas; la
                    // organización viaja por el Outlet
                    path: 'organizations/:slug',
                    lazy: async () => ({
                      Component: (
                        await import('@/features/backoffice/OrganizationCasePage')
                      ).OrganizationCasePage,
                    }),
                    children: [
                      {
                        index: true,
                        lazy: async () => ({
                          Component: (
                            await import('@/features/backoffice/CaseSummaryTab')
                          ).CaseSummaryTab,
                        }),
                      },
                      {
                        path: 'team',
                        lazy: async () => ({
                          Component: (await import('@/features/backoffice/CaseTeamTab'))
                            .CaseTeamTab,
                        }),
                      },
                      {
                        path: 'access',
                        lazy: async () => ({
                          Component: (await import('@/features/backoffice/CaseAccessTab'))
                            .CaseAccessTab,
                        }),
                      },
                      {
                        path: 'money',
                        lazy: async () => ({
                          Component: (await import('@/features/backoffice/CaseMoneyTab'))
                            .CaseMoneyTab,
                        }),
                      },
                      {
                        path: 'notes',
                        lazy: async () => ({
                          Component: (await import('@/features/backoffice/CaseNotesTab'))
                            .CaseNotesTab,
                        }),
                      },
                    ],
                  },
                  {
                    path: 'accounts',
                    lazy: async () => ({
                      Component: (
                        await import('@/features/backoffice/PlatformAccountsPage')
                      ).PlatformAccountsPage,
                    }),
                  },
                  {
                    path: 'topups',
                    lazy: async () => ({
                      Component: (
                        await import('@/features/backoffice/PlatformTopUpsPage')
                      ).PlatformTopUpsPage,
                    }),
                  },
                  {
                    path: 'transactions',
                    lazy: async () => ({
                      Component: (
                        await import('@/features/backoffice/PlatformTransactionsPage')
                      ).PlatformTransactionsPage,
                    }),
                  },
                  {
                    path: 'pricing',
                    lazy: async () => ({
                      Component: (
                        await import('@/features/backoffice/PlatformPricingPage')
                      ).PlatformPricingPage,
                    }),
                  },
                  {
                    path: 'history',
                    lazy: async () => ({
                      Component: (
                        await import('@/features/backoffice/PlatformChangesPage')
                      ).PlatformChangesPage,
                    }),
                  },
                  {
                    path: 'staff',
                    lazy: async () => ({
                      Component: (await import('@/features/backoffice/PlatformStaffPage'))
                        .PlatformStaffPage,
                    }),
                  },
                  {
                    path: 'activity',
                    lazy: async () => ({
                      Component: (
                        await import('@/features/backoffice/PlatformActivityPage')
                      ).PlatformActivityPage,
                    }),
                  },
                  {
                    path: 'operations',
                    lazy: async () => ({
                      Component: (await import('@/features/backoffice/OperationsPage'))
                        .OperationsPage,
                    }),
                    children: [
                      {
                        path: 'payments',
                        lazy: async () => ({
                          Component: (
                            await import('@/features/backoffice/PaymentNoticesTab')
                          ).PaymentNoticesTab,
                        }),
                      },
                      {
                        path: 'emails',
                        lazy: async () => ({
                          Component: (await import('@/features/backoffice/EmailsTab'))
                            .EmailsTab,
                        }),
                      },
                      {
                        path: 'tasks',
                        lazy: async () => ({
                          Component: (
                            await import('@/features/backoffice/ScheduledTasksTab')
                          ).ScheduledTasksTab,
                        }),
                      },
                    ],
                  },
                ],
              },
            ],
          },
          {
            path: 'app',
            lazy: async () => ({
              Component: (await import('@/layouts/AppLayout')).AppLayout,
            }),
            children: [
              { index: true, element: <Navigate to="/app/servers" replace /> },
              {
                path: 'servers',
                lazy: async () => ({
                  Component: (await import('@/features/servers/ServersPage')).ServersPage,
                }),
              },
              {
                // Ficha del servidor: cada pestaña, ruta hija con URL propia
                path: 'servers/:serverId',
                lazy: async () => ({
                  Component: (await import('@/features/servers/ServerPage')).ServerPage,
                }),
                children: [
                  {
                    index: true,
                    lazy: async () => ({
                      Component: (await import('@/features/servers/ServerSummaryTab'))
                        .ServerSummaryTab,
                    }),
                  },
                  {
                    path: 'credentials',
                    lazy: async () => ({
                      Component: (await import('@/features/servers/ServerCredentialsTab'))
                        .ServerCredentialsTab,
                    }),
                  },
                  {
                    path: 'links',
                    lazy: async () => ({
                      Component: (await import('@/features/servers/ServerLinksTab'))
                        .ServerLinksTab,
                    }),
                  },
                  {
                    path: 'access',
                    lazy: async () => ({
                      Component: (await import('@/features/servers/ServerAccessTab'))
                        .ServerAccessTab,
                    }),
                  },
                  {
                    path: 'sessions',
                    lazy: async () => ({
                      Component: (await import('@/features/servers/ServerSessionsTab'))
                        .ServerSessionsTab,
                    }),
                  },
                  {
                    path: 'stats',
                    lazy: async () => ({
                      Component: (await import('@/features/servers/ServerStatsTab'))
                        .ServerStatsTab,
                    }),
                  },
                ],
              },
              {
                path: 'credentials',
                lazy: async () => ({
                  Component: (await import('@/features/credentials/CredentialsPage'))
                    .CredentialsPage,
                }),
              },
              {
                // Ficha de la credencial: quién la usa y su historial
                path: 'credentials/:credentialId',
                lazy: async () => ({
                  Component: (await import('@/features/credentials/CredentialPage'))
                    .CredentialPage,
                }),
                children: [
                  {
                    index: true,
                    lazy: async () => ({
                      Component: (
                        await import('@/features/credentials/CredentialSessionsTab')
                      ).CredentialSessionsTab,
                    }),
                  },
                  {
                    path: 'stats',
                    lazy: async () => ({
                      Component: (
                        await import('@/features/credentials/CredentialStatsTab')
                      ).CredentialStatsTab,
                    }),
                  },
                ],
              },
              {
                path: 'organization',
                lazy: async () => ({
                  Component: (await import('@/features/organizations/OrganizationPage'))
                    .OrganizationPage,
                }),
              },
              {
                path: 'team',
                lazy: async () => ({
                  Component: (await import('@/features/members/TeamPage')).TeamPage,
                }),
                children: [
                  {
                    index: true,
                    lazy: async () => ({
                      Component: (await import('@/features/members/MembersTab'))
                        .MembersTab,
                    }),
                  },
                  {
                    path: 'groups',
                    lazy: async () => ({
                      Component: (await import('@/features/access/GroupsTab')).GroupsTab,
                    }),
                  },
                  {
                    path: 'labels',
                    lazy: async () => ({
                      Component: (await import('@/features/servers/LabelsTab')).LabelsTab,
                    }),
                  },
                ],
              },
              {
                path: 'credits',
                lazy: async () => ({
                  Component: (await import('@/features/credits/CreditsPage')).CreditsPage,
                }),
                children: [
                  {
                    index: true,
                    lazy: async () => ({
                      Component: (await import('@/features/credits/CreditsSummaryTab'))
                        .CreditsSummaryTab,
                    }),
                  },
                  {
                    path: 'transactions',
                    lazy: async () => ({
                      Component: (await import('@/features/credits/TransactionsTab'))
                        .TransactionsTab,
                    }),
                  },
                  {
                    path: 'usage',
                    lazy: async () => ({
                      Component: (await import('@/features/credits/UsageTab')).UsageTab,
                    }),
                  },
                  {
                    path: 'topups',
                    lazy: async () => ({
                      Component: (await import('@/features/credits/TopUpsTab')).TopUpsTab,
                    }),
                  },
                ],
              },
              {
                path: 'audit',
                lazy: async () => ({
                  Component: (await import('@/features/audit/AuditPage')).AuditPage,
                }),
              },
              {
                path: 'settings',
                lazy: async () => ({
                  Component: (await import('@/features/account/AccountPage')).AccountPage,
                }),
              },
              {
                path: 'settings/activity',
                lazy: async () => ({
                  Component: (await import('@/features/account/AccountActivityPage'))
                    .AccountActivityPage,
                }),
              },
            ],
          },
        ],
      },

      { path: '*', element: <NotFoundPage /> },
    ],
  },
]
