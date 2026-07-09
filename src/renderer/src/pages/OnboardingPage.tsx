import { useEffect, useState } from 'react'
import {
  Alert,
  Badge,
  Button,
  Card,
  Center,
  Container,
  Group,
  List,
  Loader,
  Stack,
  Stepper,
  Text,
  ThemeIcon,
  Title
} from '@mantine/core'
import type { PermissionStatus } from '@shared/bridge'
import type { AppConfig } from '@shared/domain'
import { useRuntime } from '../hooks/useRuntime'
import { useControllerFeed } from '../hooks/useControllerFeed'

/**
 * First-run onboarding. Critically, it asks for OS permissions EARLY (step 2)
 * so the app can actually synthesize keystrokes later. The user may continue
 * before granting — they told us they'll do it — but we make the state obvious.
 */

export interface OnboardingPageProps {
  config: AppConfig
  onPickPath: (kind: 'claudeDesktop' | 'terminal') => Promise<void>
  onComplete: () => void
}

const STEPS = 5

export function OnboardingPage({
  config,
  onPickPath,
  onComplete
}: OnboardingPageProps): JSX.Element {
  const [active, setActive] = useState(0)
  const [perms, setPerms] = useState<PermissionStatus | null>(null)
  const [checkingPerms, setCheckingPerms] = useState(false)
  // SDL (in main) sees the controller without a button press. Prefer the
  // runtime status for connection + name; fall back to the live feed's id.
  const { runtime } = useRuntime()
  const { state } = useControllerFeed()
  const connected = runtime.connected || state.connected
  const controllerName = runtime.controllerName ?? state.id

  const next = (): void => setActive((s) => Math.min(STEPS - 1, s + 1))
  const back = (): void => setActive((s) => Math.max(0, s - 1))

  const checkPermissions = async (): Promise<void> => {
    setCheckingPerms(true)
    try {
      const result = await window.claudepad.checkPermissions()
      setPerms(result)
    } finally {
      setCheckingPerms(false)
    }
  }

  // Auto-check permissions when the user reaches that step.
  useEffect(() => {
    if (active === 1 && !perms) void checkPermissions()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active])

  const isMac = perms?.platform === 'darwin'
  const needsAccessibility = isMac && perms !== null && !perms.accessibility

  return (
    <Center mih="100vh" p="xl">
      <Container size="sm" w="100%">
        <Stack gap="lg">
          <Stack gap={4}>
            <Title order={2}>Welcome to ClaudePad</Title>
            <Text c="dimmed" size="sm">
              A quick setup so your controller can drive Claude.
            </Text>
          </Stack>

          <Stepper active={active} onStepClick={setActive} size="sm" allowNextStepsSelect={false}>
            {/* 1 — Welcome */}
            <Stepper.Step label="Welcome" description="What this is">
              <Card withBorder padding="lg" mt="md">
                <Stack gap="sm">
                  <Title order={3}>Drive Claude with a controller</Title>
                  <Text>
                    ClaudePad maps your PS4 / DualShock controller to Claude Desktop,
                    Claude Code (CLI), and your OS — send messages, switch models, scroll,
                    and move the cursor without touching the keyboard.
                  </Text>
                  <Text c="dimmed" size="sm">
                    Next we&apos;ll grant a permission, pair your controller, and (optionally)
                    point at your apps.
                  </Text>
                </Stack>
              </Card>
            </Stepper.Step>

            {/* 2 — Permissions */}
            <Stepper.Step label="Permissions" description="Allow input control">
              <Card withBorder padding="lg" mt="md">
                <Stack gap="md">
                  <Title order={3}>Accessibility permission</Title>
                  <Text size="sm">
                    To press keys and move the mouse on your behalf, ClaudePad needs the
                    OS to trust it. On macOS that&apos;s the{' '}
                    <b>Accessibility</b> permission.
                  </Text>

                  {checkingPerms && (
                    <Group gap="xs">
                      <Loader size="xs" />
                      <Text size="sm" c="dimmed">
                        Checking permissions…
                      </Text>
                    </Group>
                  )}

                  {perms && !isMac && (
                    <Alert color="green" variant="light" title="You're all set">
                      No extra permission is required on {perms.platform}.
                    </Alert>
                  )}

                  {perms && isMac && perms.accessibility && (
                    <Alert color="green" variant="light" title="Accessibility granted">
                      ClaudePad can control input. You&apos;re good to go.
                    </Alert>
                  )}

                  {needsAccessibility && (
                    <Alert color="yellow" variant="light" title="Accessibility not granted yet">
                      <Stack gap="sm">
                        <Text size="sm">
                          Open System Settings and enable ClaudePad under
                          Privacy &amp; Security → Accessibility. You can continue setup
                          now and grant it afterward.
                        </Text>
                        <Group>
                          <Button
                            variant="light"
                            onClick={() => window.claudepad.openAccessibilitySettings()}
                          >
                            Open Accessibility Settings
                          </Button>
                          <Button
                            variant="subtle"
                            loading={checkingPerms}
                            onClick={() => void checkPermissions()}
                          >
                            Re-check
                          </Button>
                        </Group>
                      </Stack>
                    </Alert>
                  )}
                </Stack>
              </Card>
            </Stepper.Step>

            {/* 3 — Connect controller */}
            <Stepper.Step label="Controller" description="Pair it">
              <Card withBorder padding="lg" mt="md">
                <Stack gap="md">
                  <Title order={3}>Connect your controller</Title>
                  <Text size="sm">
                    Plug in via USB or pair over Bluetooth. The background service
                    detects it automatically — <b>no button press needed</b>.
                  </Text>
                  {connected ? (
                    <Alert color="green" variant="light">
                      <Group gap="xs">
                        <ThemeIcon color="green" radius="xl" size="sm">
                          ✓
                        </ThemeIcon>
                        <Stack gap={0}>
                          <Text fw={600} size="sm">
                            Controller connected
                          </Text>
                          <Text size="xs" c="dimmed">
                            {controllerName || 'Gamepad detected'}
                          </Text>
                        </Stack>
                      </Group>
                    </Alert>
                  ) : (
                    <Alert color="gray" variant="light">
                      <Group gap="xs">
                        <Loader size="xs" />
                        <Text size="sm">Waiting for a controller…</Text>
                      </Group>
                    </Alert>
                  )}
                  <Text size="xs" c="dimmed">
                    No controller? You can still continue and pair later — the Tester page
                    will show it live.
                  </Text>
                </Stack>
              </Card>
            </Stepper.Step>

            {/* 4 — Apps */}
            <Stepper.Step label="Apps" description="Optional">
              <Card withBorder padding="lg" mt="md">
                <Stack gap="md">
                  <Title order={3}>Point at your apps (optional)</Title>
                  <Text size="sm">
                    Set these so the &quot;Launch&quot; actions can open the right app. You
                    can skip and configure them later in Settings.
                  </Text>
                  <List spacing="sm" size="sm">
                    <List.Item>
                      <Group gap="sm">
                        <Button
                          size="xs"
                          variant="light"
                          onClick={() => void onPickPath('claudeDesktop')}
                        >
                          Choose Claude Desktop…
                        </Button>
                        {config.paths.claudeDesktop ? (
                          <Badge variant="light" color="green">
                            Set
                          </Badge>
                        ) : (
                          <Text size="xs" c="dimmed">
                            Not set
                          </Text>
                        )}
                      </Group>
                      {config.paths.claudeDesktop && (
                        <Text size="xs" c="dimmed" style={{ wordBreak: 'break-all' }}>
                          {config.paths.claudeDesktop}
                        </Text>
                      )}
                    </List.Item>
                    <List.Item>
                      <Group gap="sm">
                        <Button
                          size="xs"
                          variant="light"
                          onClick={() => void onPickPath('terminal')}
                        >
                          Choose terminal…
                        </Button>
                        {config.paths.terminal ? (
                          <Badge variant="light" color="green">
                            Set
                          </Badge>
                        ) : (
                          <Text size="xs" c="dimmed">
                            Not set
                          </Text>
                        )}
                      </Group>
                      {config.paths.terminal && (
                        <Text size="xs" c="dimmed" style={{ wordBreak: 'break-all' }}>
                          {config.paths.terminal}
                        </Text>
                      )}
                    </List.Item>
                  </List>
                </Stack>
              </Card>
            </Stepper.Step>

            {/* 5 — Done */}
            <Stepper.Completed>
              <Card withBorder padding="lg" mt="md">
                <Stack gap="md" align="center">
                  <ThemeIcon color="clay" size={56} radius="xl">
                    ✓
                  </ThemeIcon>
                  <Title order={3}>You&apos;re ready</Title>
                  <Text ta="center" c="dimmed" size="sm">
                    A default mapping is already loaded. Head to the Tester to feel out
                    sensitivity, or the Mapper to customize what each button does.
                  </Text>
                  <Button size="md" onClick={onComplete}>
                    Enter ClaudePad
                  </Button>
                </Stack>
              </Card>
            </Stepper.Completed>
          </Stepper>

          {active < STEPS - 1 ? (
            <Group justify="space-between">
              <Button variant="subtle" onClick={back} disabled={active === 0}>
                Back
              </Button>
              <Button onClick={next}>{active === STEPS - 2 ? 'Finish' : 'Continue'}</Button>
            </Group>
          ) : null}
        </Stack>
      </Container>
    </Center>
  )
}
