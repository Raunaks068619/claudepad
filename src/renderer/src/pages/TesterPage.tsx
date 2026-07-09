import {
  Alert,
  Badge,
  Card,
  Grid,
  Group,
  Progress,
  SimpleGrid,
  Slider,
  Stack,
  Switch,
  Text,
  Title,
  Tooltip
} from '@mantine/core'
import type { AxisId, ControllerState, Profile } from '@shared/domain'
import { ALL_AXES, ALL_BUTTONS } from '@shared/domain'
import { shapeAxis } from '@shared/mapping-engine'
import { ControllerVisual } from '../components/ControllerVisual'

/**
 * Tester — feel out the controller, tune sensitivity, and see raw vs shaped
 * stick values.
 *
 * Input is read by the background service in the MAIN process, so it keeps
 * working even when you switch to Claude. This page just visualizes the live
 * feed and previews the sensitivity shaping. The "Arm output" switch here is
 * the same global safety gate as the one in the app header — toggling it calls
 * window.claudepad.setArmed.
 */

export interface TesterPageProps {
  state: ControllerState
  connected: boolean
  profile: Profile
  armed: boolean
  onSetArmed: (armed: boolean) => void
  onSensitivityChange: (patch: Partial<Profile['sensitivity']>) => void
}

function fmt(n: number): string {
  return (n >= 0 ? ' ' : '') + n.toFixed(2)
}

export function TesterPage({
  state,
  connected,
  profile,
  armed,
  onSetArmed,
  onSensitivityChange
}: TesterPageProps): JSX.Element {
  const sens = profile.sensitivity

  const RawShaped = ({ label, id }: { label: string; id: AxisId }): JSX.Element => {
    const raw = state.axes[id]
    const shaped = shapeAxis(raw, sens)
    return (
      <Group justify="space-between" gap="xs">
        <Text size="sm" w={56} c="dimmed">
          {label}
        </Text>
        <Text size="sm" ff="monospace" w={70} ta="right">
          {fmt(raw)}
        </Text>
        <Text size="xs" c="dimmed">
          →
        </Text>
        <Text size="sm" ff="monospace" w={70} ta="right" c="clay.4" fw={600}>
          {fmt(shaped)}
        </Text>
      </Group>
    )
  }

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start">
        <Stack gap={2}>
          <Title order={2}>Tester</Title>
          <Text c="dimmed" size="sm">
            Check your controls, tune sensitivity, and see the shaping in action.
          </Text>
        </Stack>
        <Tooltip
          label={
            armed
              ? 'Output is LIVE — inputs will actuate your OS.'
              : 'Output is off — safe to test without sending input.'
          }
          withArrow
        >
          <Switch
            checked={armed}
            onChange={(e) => onSetArmed(e.currentTarget.checked)}
            label="Arm output"
            color="red"
            size="md"
          />
        </Tooltip>
      </Group>

      <Alert color="gray" variant="light" title="Input runs in the background">
        Input is read by the background service — it keeps working when you
        switch to Claude. Nothing is sent to your OS unless output is armed.
      </Alert>

      {armed && (
        <Alert color="red" variant="light" title="Output armed">
          Button presses and stick motion are now being sent to your system.
        </Alert>
      )}

      <Grid gutter="lg">
        {/* Controller visual */}
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card withBorder padding="lg" h="100%">
            <Stack gap="md">
              <Group justify="space-between">
                <Title order={4}>Live controller</Title>
                <Badge color={connected ? 'green' : 'gray'} variant="light">
                  {connected ? 'Connected' : 'No controller'}
                </Badge>
              </Group>
              <ControllerVisual state={state} />
              {state.id && (
                <Text size="xs" c="dimmed" ta="center">
                  {state.id}
                </Text>
              )}
            </Stack>
          </Card>
        </Grid.Col>

        {/* Sensitivity + raw vs shaped */}
        <Grid.Col span={{ base: 12, md: 6 }}>
          <Card withBorder padding="lg" h="100%">
            <Stack gap="lg">
              <Title order={4}>Sensitivity</Title>

              <Stack gap={4}>
                <Group justify="space-between">
                  <Text size="sm">Deadzone</Text>
                  <Text size="sm" ff="monospace" c="dimmed">
                    {sens.deadzone.toFixed(2)}
                  </Text>
                </Group>
                <Slider
                  min={0}
                  max={0.4}
                  step={0.01}
                  value={sens.deadzone}
                  onChange={(v) => onSensitivityChange({ deadzone: v })}
                  color="clay"
                  label={(v) => v.toFixed(2)}
                />
              </Stack>

              <Stack gap={4}>
                <Group justify="space-between">
                  <Text size="sm">Curve</Text>
                  <Text size="sm" ff="monospace" c="dimmed">
                    {sens.curve.toFixed(2)}
                  </Text>
                </Group>
                <Slider
                  min={1}
                  max={3}
                  step={0.05}
                  value={sens.curve}
                  onChange={(v) => onSensitivityChange({ curve: v })}
                  color="clay"
                  label={(v) => v.toFixed(2)}
                />
              </Stack>

              <Stack gap={4}>
                <Group justify="space-between">
                  <Text size="sm">Trigger threshold</Text>
                  <Text size="sm" ff="monospace" c="dimmed">
                    {sens.triggerThreshold.toFixed(2)}
                  </Text>
                </Group>
                <Slider
                  min={0}
                  max={1}
                  step={0.01}
                  value={sens.triggerThreshold}
                  onChange={(v) => onSensitivityChange({ triggerThreshold: v })}
                  color="clay"
                  label={(v) => v.toFixed(2)}
                />
              </Stack>

              <Card withBorder padding="sm" bg="dark.6">
                <Stack gap={6}>
                  <Group justify="space-between">
                    <Text size="xs" c="dimmed" fw={600}>
                      RAW
                    </Text>
                    <Text size="xs" c="clay.4" fw={600}>
                      SHAPED
                    </Text>
                  </Group>
                  <RawShaped label="Left X" id="LeftX" />
                  <RawShaped label="Left Y" id="LeftY" />
                  <RawShaped label="Right X" id="RightX" />
                  <RawShaped label="Right Y" id="RightY" />
                </Stack>
              </Card>
            </Stack>
          </Card>
        </Grid.Col>
      </Grid>

      {/* Buttons panel */}
      <Card withBorder padding="lg">
        <Stack gap="md">
          <Title order={4}>Buttons</Title>
          <SimpleGrid cols={{ base: 3, sm: 4, md: 6 }} spacing="xs">
            {ALL_BUTTONS.map((b) => {
              const on = state.buttons[b]
              return (
                <Badge
                  key={b}
                  size="lg"
                  variant={on ? 'filled' : 'light'}
                  color={on ? 'clay' : 'gray'}
                  radius="sm"
                  fullWidth
                >
                  {b}
                </Badge>
              )
            })}
          </SimpleGrid>
        </Stack>
      </Card>

      {/* Axes panel */}
      <Card withBorder padding="lg">
        <Stack gap="md">
          <Title order={4}>Axes</Title>
          <SimpleGrid cols={{ base: 1, sm: 2, md: 3 }} spacing="md">
            {ALL_AXES.map((a) => {
              const v = state.axes[a]
              const isTrigger = a === 'L2' || a === 'R2'
              // Sticks are -1..1 (map to 0..100 centered); triggers 0..1.
              const pct = isTrigger ? v * 100 : (v + 1) * 50
              return (
                <Stack key={a} gap={4}>
                  <Group justify="space-between">
                    <Text size="sm">{a}</Text>
                    <Text size="sm" ff="monospace" c="dimmed">
                      {fmt(v)}
                    </Text>
                  </Group>
                  <Progress
                    value={Math.max(0, Math.min(100, pct))}
                    color="clay"
                    size="lg"
                    radius="sm"
                  />
                </Stack>
              )
            })}
          </SimpleGrid>
        </Stack>
      </Card>
    </Stack>
  )
}
