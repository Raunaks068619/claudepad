import { useMemo, useState } from 'react'
import {
  ActionIcon,
  Alert,
  Badge,
  Button,
  Card,
  Divider,
  Group,
  SegmentedControl,
  Select,
  Slider,
  Stack,
  Switch,
  Text,
  TextInput,
  Title
} from '@mantine/core'
import type {
  AxisMap,
  Binding,
  ButtonId,
  CustomAction,
  CustomActionKind,
  Profile,
  Trigger
} from '@shared/domain'
import { ALL_BUTTONS } from '@shared/domain'
import { ACTION_CATALOG } from '@shared/claude-actions'
import { BindingRow, inputLabel } from '../components/BindingRow'
import { KeyCapture } from '../components/KeyCapture'

/**
 * Mapper — bind controller inputs to Claude actions and configure the sticks.
 *
 * The master "Enabled" switch (config.enabled) is the persisted kill-switch.
 * The renderer no longer runs the engine or actuates anything — the MAIN
 * process reloads config automatically on save and does the mapping. Binding
 * edits persist via useConfig; main picks them up on its own.
 */

export interface MapperPageProps {
  profile: Profile
  enabled: boolean
  onEnabledChange: (enabled: boolean) => void
  onUpdateProfile: (mut: (p: Profile) => Profile) => void
}

const AXIS_TARGETS: { value: AxisMap['target']; label: string }[] = [
  { value: 'cursor', label: 'Move cursor' },
  { value: 'scroll', label: 'Scroll' }
]

function newBindingId(): string {
  return `b-${Math.random().toString(36).slice(2, 9)}`
}

function newCustomId(): string {
  return `custom-${Math.random().toString(36).slice(2, 9)}`
}

export function MapperPage({
  profile,
  enabled,
  onEnabledChange,
  onUpdateProfile
}: MapperPageProps): JSX.Element {
  const [addInput, setAddInput] = useState<ButtonId | null>(null)

  const updateBinding = (next: Binding): void => {
    onUpdateProfile((p) => ({
      ...p,
      bindings: p.bindings.map((b) => (b.id === next.id ? next : b))
    }))
  }

  const removeBinding = (id: string): void => {
    onUpdateProfile((p) => ({
      ...p,
      bindings: p.bindings.filter((b) => b.id !== id)
    }))
  }

  const addBinding = (): void => {
    if (!addInput) return
    const binding: Binding = {
      id: newBindingId(),
      input: addInput,
      trigger: 'press' as Trigger,
      actionId: ACTION_CATALOG[0].id
    }
    onUpdateProfile((p) => ({ ...p, bindings: [...p.bindings, binding] }))
    setAddInput(null)
  }

  const updateAxisMap = (id: string, patch: Partial<AxisMap>): void => {
    onUpdateProfile((p) => ({
      ...p,
      axisMaps: p.axisMaps.map((m) => (m.id === id ? { ...m, ...patch } : m))
    }))
  }

  // ---- Custom commands ----------------------------------------------------
  const customActions = profile.customActions ?? []

  const addCustom = (): void => {
    const ca: CustomAction = {
      id: newCustomId(),
      label: 'New command',
      kind: 'text',
      text: '',
      submit: false
    }
    onUpdateProfile((p) => ({ ...p, customActions: [...(p.customActions ?? []), ca] }))
  }

  const updateCustom = (id: string, patch: Partial<CustomAction>): void => {
    onUpdateProfile((p) => ({
      ...p,
      customActions: (p.customActions ?? []).map((c) => (c.id === id ? { ...c, ...patch } : c))
    }))
  }

  const removeCustom = (id: string): void => {
    onUpdateProfile((p) => ({
      ...p,
      customActions: (p.customActions ?? []).filter((c) => c.id !== id)
    }))
  }

  // Order bindings by the canonical ALL_BUTTONS order for a stable list.
  const orderedBindings = useMemo(() => {
    const rank = new Map(ALL_BUTTONS.map((b, i) => [b, i]))
    return [...profile.bindings].sort(
      (a, b) => (rank.get(a.input) ?? 99) - (rank.get(b.input) ?? 99)
    )
  }, [profile.bindings])

  return (
    <Stack gap="lg">
      <Group justify="space-between" align="flex-start">
        <Stack gap={2}>
          <Title order={2}>Mapper</Title>
          <Text c="dimmed" size="sm">
            Map controller inputs to Claude options. Output is armed here.
          </Text>
        </Stack>
        <Switch
          checked={enabled}
          onChange={(e) => onEnabledChange(e.currentTarget.checked)}
          label="Enabled"
          size="md"
          color="clay"
        />
      </Group>

      {!enabled && (
        <Alert color="gray" variant="light" title="Mapping disabled">
          The master switch is off — nothing is being sent. Turn on{' '}
          <b>Enabled</b> to make your controller drive Claude.
        </Alert>
      )}

      {/* Bindings */}
      <Card withBorder padding="lg">
        <Stack gap="md">
          <Group justify="space-between">
            <Title order={4}>Button bindings</Title>
            <Badge variant="light" color="gray">
              {profile.bindings.length} bound
            </Badge>
          </Group>

          <Stack gap="sm">
            {orderedBindings.map((b) => (
              <BindingRow
                key={b.id}
                binding={b}
                customActions={customActions}
                onChange={updateBinding}
                onRemove={removeBinding}
              />
            ))}
            {orderedBindings.length === 0 && (
              <Text c="dimmed" size="sm">
                No bindings yet — add one below.
              </Text>
            )}
          </Stack>

          <Divider />

          <Group gap="sm" align="flex-end">
            <Select
              label="Add binding for"
              placeholder="Choose an input (inputs can have more than one binding)"
              data={ALL_BUTTONS.map((b) => ({ value: b, label: inputLabel(b) }))}
              value={addInput}
              onChange={(v) => setAddInput(v as ButtonId | null)}
              comboboxProps={{ withinPortal: true }}
              searchable
              w={240}
            />
            <Button onClick={addBinding} disabled={!addInput}>
              Add binding
            </Button>
          </Group>
        </Stack>
      </Card>

      {/* Custom commands */}
      <Card withBorder padding="lg">
        <Stack gap="md">
          <Group justify="space-between">
            <Stack gap={2}>
              <Title order={4}>Custom commands</Title>
              <Text size="sm" c="dimmed">
                Make your own actions — type any text/snippet or fire any keyboard shortcut — then
                bind them to a button above (they appear under <b>Custom</b>).
              </Text>
            </Stack>
            <Badge variant="light" color="gray">
              {customActions.length}
            </Badge>
          </Group>

          <Stack gap="sm">
            {customActions.map((ca) => (
              <Card key={ca.id} withBorder padding="md" bg="dark.6">
                <Stack gap="sm">
                  <Group gap="sm" wrap="nowrap" align="flex-end">
                    <TextInput
                      label="Name"
                      value={ca.label}
                      onChange={(e) => updateCustom(ca.id, { label: e.currentTarget.value })}
                      style={{ flex: 1 }}
                      placeholder="e.g. Screenshot, Insert signature"
                    />
                    <SegmentedControl
                      value={ca.kind}
                      onChange={(v) => updateCustom(ca.id, { kind: v as CustomActionKind })}
                      data={[
                        { label: 'Text', value: 'text' },
                        { label: 'Shortcut', value: 'keys' }
                      ]}
                    />
                    <ActionIcon
                      variant="subtle"
                      color="red"
                      onClick={() => removeCustom(ca.id)}
                      aria-label={`Remove ${ca.label}`}
                      mb={4}
                    >
                      ✕
                    </ActionIcon>
                  </Group>

                  {ca.kind === 'text' ? (
                    <Group gap="sm" wrap="nowrap" align="flex-end">
                      <TextInput
                        label="Text to type"
                        placeholder="e.g. /model  or a snippet you paste a lot"
                        value={ca.text ?? ''}
                        onChange={(e) => updateCustom(ca.id, { text: e.currentTarget.value })}
                        style={{ flex: 1 }}
                      />
                      <Switch
                        label="Press Enter"
                        checked={!!ca.submit}
                        onChange={(e) => updateCustom(ca.id, { submit: e.currentTarget.checked })}
                        mb={8}
                      />
                    </Group>
                  ) : (
                    <Stack gap={4}>
                      <Text size="sm">Shortcut</Text>
                      <KeyCapture
                        value={ca.keys ?? []}
                        onChange={(keys) => updateCustom(ca.id, { keys })}
                      />
                    </Stack>
                  )}
                </Stack>
              </Card>
            ))}
            {customActions.length === 0 && (
              <Text c="dimmed" size="sm">
                No custom commands yet — add one below.
              </Text>
            )}
          </Stack>

          <Group>
            <Button variant="light" onClick={addCustom}>
              Add custom command
            </Button>
          </Group>
        </Stack>
      </Card>

      {/* Axis maps */}
      <Card withBorder padding="lg">
        <Stack gap="md">
          <Title order={4}>Analog sticks</Title>
          <Text size="sm" c="dimmed">
            Choose what each stick controls and how fast.
          </Text>
          {profile.axisMaps.map((m) => (
            <Card key={m.id} withBorder padding="md" bg="dark.6">
              <Stack gap="sm">
                <Group justify="space-between">
                  <Badge variant="light" color="clay" radius="sm" size="lg">
                    {m.source === 'left' ? 'Left stick' : 'Right stick'}
                  </Badge>
                  <Select
                    data={AXIS_TARGETS}
                    value={m.target}
                    onChange={(v) =>
                      v && updateAxisMap(m.id, { target: v as AxisMap['target'] })
                    }
                    allowDeselect={false}
                    comboboxProps={{ withinPortal: true }}
                    w={160}
                  />
                </Group>
                <Stack gap={4}>
                  <Group justify="space-between">
                    <Text size="sm">Speed</Text>
                    <Text size="sm" ff="monospace" c="dimmed">
                      {m.speed.toFixed(0)}
                    </Text>
                  </Group>
                  <Slider
                    min={1}
                    max={40}
                    step={1}
                    value={m.speed}
                    onChange={(v) => updateAxisMap(m.id, { speed: v })}
                    color="clay"
                    label={(v) => v.toFixed(0)}
                  />
                </Stack>
              </Stack>
            </Card>
          ))}
          {profile.axisMaps.length === 0 && (
            <Text c="dimmed" size="sm">
              No stick mappings configured.
            </Text>
          )}
        </Stack>
      </Card>
    </Stack>
  )
}
