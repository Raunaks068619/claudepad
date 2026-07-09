import { useState } from 'react'
import {
  Badge,
  Center,
  Group,
  Loader,
  Stack,
  Switch,
  Text,
  Tooltip
} from '@mantine/core'
import { useConfig } from './state/useConfig'
import { useControllerFeed } from './hooks/useControllerFeed'
import { useRuntime } from './hooks/useRuntime'
import { OnboardingPage } from './pages/OnboardingPage'
import { TesterPage } from './pages/TesterPage'
import { MapperPage } from './pages/MapperPage'
import { SettingsPage } from './pages/SettingsPage'
import classes from './App.module.css'

/**
 * App shell: a left nav (Tester / Mapper / Settings) with route-by-state.
 * Onboarding gates everything — until config.onboardingComplete is true we show
 * the onboarding flow full-screen.
 *
 * Input + the mapping engine now run in the MAIN process (via SDL), so they
 * work even when ClaudePad is in the background. The renderer just consumes a
 * live feed (useControllerFeed) for visualization and reflects/toggles the
 * safety gate (useRuntime). The always-visible "Arm controller output" switch
 * in the header is the single global gate: when armed (and Enabled), the
 * controller drives your OS regardless of which app is focused.
 */

type Route = 'tester' | 'mapper' | 'settings'

const NAV_ITEMS: { route: Route; label: string; hint: string }[] = [
  { route: 'tester', label: 'Tester', hint: 'Check controls & sensitivity' },
  { route: 'mapper', label: 'Mapper', hint: 'Map inputs to Claude' },
  { route: 'settings', label: 'Settings', hint: 'Paths & permissions' }
]

export function App(): JSX.Element {
  const {
    config,
    loading,
    activeProfile,
    updateProfile,
    setEnabled,
    setPaths,
    patchConfig,
    completeOnboarding
  } = useConfig()
  const { state, connected } = useControllerFeed()
  const { runtime, setArmed } = useRuntime()
  const [route, setRoute] = useState<Route>('tester')

  // Shared: pick an app path and persist it.
  const pickPath = async (kind: 'claudeDesktop' | 'terminal'): Promise<void> => {
    const chosen = await window.claudepad.pickPath(kind)
    if (chosen) setPaths({ [kind]: chosen })
  }

  if (loading || !config || !activeProfile) {
    return (
      <Center mih="100vh">
        <Stack align="center" gap="sm">
          <Loader color="clay" />
          <Text c="dimmed" size="sm">
            Loading ClaudePad…
          </Text>
        </Stack>
      </Center>
    )
  }

  // Onboarding gate.
  if (!config.onboardingComplete) {
    return (
      <OnboardingPage
        config={config}
        onPickPath={pickPath}
        onComplete={completeOnboarding}
      />
    )
  }

  return (
    <div className={classes.shell}>
      <nav className={classes.nav}>
        <div className={classes.brand}>
          <div className={classes.brandMark}>CP</div>
          <Text fw={700}>ClaudePad</Text>
        </div>

        <div className={classes.navLinks}>
          {NAV_ITEMS.map((item) => (
            <button
              key={item.route}
              type="button"
              className={`${classes.navItem} ${
                route === item.route ? classes.navItemActive : ''
              }`}
              onClick={() => setRoute(item.route)}
            >
              <Stack gap={0}>
                <Text size="sm" fw={600} component="span">
                  {item.label}
                </Text>
                <Text size="xs" c="dimmed" component="span">
                  {item.hint}
                </Text>
              </Stack>
            </button>
          ))}
        </div>

        <div className={classes.navFooter}>
          <Group gap="xs" wrap="nowrap">
            <Badge
              color={runtime.connected ? 'green' : 'gray'}
              variant="dot"
              styles={{ root: { textTransform: 'none' } }}
            >
              {runtime.connected
                ? runtime.controllerName ?? 'Controller'
                : 'No controller'}
            </Badge>
          </Group>
          <Badge
            color={config.enabled ? 'clay' : 'gray'}
            variant={config.enabled ? 'filled' : 'light'}
            fullWidth
          >
            {config.enabled ? 'Mapping on' : 'Mapping off'}
          </Badge>
        </div>
      </nav>

      <main className={classes.content}>
        <div className={classes.topbar}>
          <Group gap="sm" wrap="nowrap">
            <span
              className={classes.statusDot}
              data-connected={runtime.connected || undefined}
              aria-hidden
            />
            <Text size="sm" fw={500}>
              {runtime.connected
                ? runtime.controllerName ?? 'Controller connected'
                : 'No controller'}
            </Text>
          </Group>

          <Tooltip
            label={
              runtime.armed
                ? 'Armed — your controller drives your OS globally, even when ClaudePad is in the background.'
                : 'Disarmed — the controller is read but no input is sent. Turn on to drive Claude and your OS.'
            }
            withArrow
            multiline
            w={280}
          >
            <Switch
              checked={runtime.armed}
              onChange={(e) => setArmed(e.currentTarget.checked)}
              label="Arm controller output"
              color="red"
              size="md"
            />
          </Tooltip>
        </div>

        <div className={classes.contentInner}>
          {route === 'tester' && (
            <TesterPage
              state={state}
              connected={connected}
              profile={activeProfile}
              armed={runtime.armed}
              onSetArmed={setArmed}
              onSensitivityChange={(patch) =>
                updateProfile((p) => ({
                  ...p,
                  sensitivity: { ...p.sensitivity, ...patch }
                }))
              }
            />
          )}

          {route === 'mapper' && (
            <MapperPage
              profile={activeProfile}
              enabled={config.enabled}
              onEnabledChange={setEnabled}
              onUpdateProfile={updateProfile}
            />
          )}

          {route === 'settings' && (
            <SettingsPage
              config={config}
              onEnabledChange={setEnabled}
              onSetInputBackend={(backend) => patchConfig({ inputBackend: backend })}
              onPickPath={pickPath}
            />
          )}
        </div>
      </main>
    </div>
  )
}
