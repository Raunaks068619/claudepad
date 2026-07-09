import { useMemo } from 'react'
import { ActionIcon, Badge, Group, Select, Tooltip } from '@mantine/core'
import type { Binding, ButtonId, CustomAction, Trigger } from '@shared/domain'
import { actionsByCategory, getAction } from '@shared/claude-actions'

/**
 * One editable binding: [input badge] [trigger select] [action select] [remove].
 * The action select is grouped by catalog category so the four categories
 * (Claude Desktop / Claude Code (CLI) / System / Launch) stay legible.
 */

export interface BindingRowProps {
  binding: Binding
  /** The profile's user-defined commands, offered alongside catalog actions. */
  customActions?: CustomAction[]
  onChange: (next: Binding) => void
  onRemove: (id: string) => void
}

const TRIGGER_OPTIONS: { value: Trigger; label: string }[] = [
  { value: 'press', label: 'On press' },
  { value: 'release', label: 'On release' },
  { value: 'hold', label: 'While held' }
]

/** Friendly label for a physical input. */
export function inputLabel(input: ButtonId): string {
  const map: Partial<Record<ButtonId, string>> = {
    Cross: 'Cross ✕',
    Circle: 'Circle ○',
    Square: 'Square □',
    Triangle: 'Triangle △',
    DpadUp: 'D-pad Up',
    DpadDown: 'D-pad Down',
    DpadLeft: 'D-pad Left',
    DpadRight: 'D-pad Right',
    L3: 'L3 (stick)',
    R3: 'R3 (stick)',
    PS: 'PS',
    Touchpad: 'Touchpad'
  }
  return map[input] ?? input
}

export function BindingRow({
  binding,
  customActions,
  onChange,
  onRemove
}: BindingRowProps): JSX.Element {
  const customs = customActions ?? []

  // Grouped action options: the catalog categories plus a "Custom" group.
  const actionGroups = useMemo(() => {
    const byCat = actionsByCategory()
    const groups = Object.entries(byCat).map(([group, defs]) => ({
      group,
      items: defs.map((d) => ({ value: d.id, label: d.label }))
    }))
    if (customs.length > 0) {
      groups.push({
        group: 'Custom',
        items: customs.map((c) => ({ value: c.id, label: c.label }))
      })
    }
    return groups
  }, [customs])

  // Resolve the bound action from custom commands first, then the catalog.
  const custom = customs.find((c) => c.id === binding.actionId)
  const catalogAction = getAction(binding.actionId)
  const resolvedLabel = custom?.label ?? catalogAction?.description ?? 'No action bound'
  const resolvedCategory = custom ? 'Custom' : catalogAction?.category
  const isKnown = Boolean(custom || catalogAction)

  return (
    <Group gap="sm" wrap="nowrap" align="center">
      <Badge
        size="lg"
        variant="light"
        color="clay"
        radius="sm"
        style={{ minWidth: 110, justifyContent: 'flex-start' }}
      >
        {inputLabel(binding.input)}
      </Badge>

      <Select
        data={TRIGGER_OPTIONS}
        value={binding.trigger}
        onChange={(val) => val && onChange({ ...binding, trigger: val as Trigger })}
        allowDeselect={false}
        comboboxProps={{ withinPortal: true }}
        w={140}
        aria-label={`Trigger for ${binding.input}`}
      />

      <Select
        data={actionGroups}
        value={binding.actionId}
        onChange={(val) => val && onChange({ ...binding, actionId: val })}
        allowDeselect={false}
        searchable
        comboboxProps={{ withinPortal: true }}
        placeholder="Choose an action"
        style={{ flex: 1, minWidth: 220 }}
        aria-label={`Action for ${binding.input}`}
        error={!isKnown ? 'Unknown action' : undefined}
      />

      <Tooltip label={resolvedLabel} withArrow>
        <Badge variant="outline" color="gray" radius="sm" style={{ minWidth: 130 }}>
          {resolvedCategory ?? '—'}
        </Badge>
      </Tooltip>

      <Tooltip label="Remove binding" withArrow>
        <ActionIcon
          variant="subtle"
          color="red"
          onClick={() => onRemove(binding.id)}
          aria-label={`Remove binding for ${binding.input}`}
        >
          ✕
        </ActionIcon>
      </Tooltip>
    </Group>
  )
}
