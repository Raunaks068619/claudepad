import { useEffect, useState } from 'react'
import {
  Alert,
  Badge,
  Button,
  Card,
  Code,
  Group,
  Loader,
  Stack,
  Switch,
  Text,
  Title
} from '@mantine/core'
import type { PermissionStatus } from '@shared/bridge'
import type { AppConfig } from '@shared/domain'

/**
 * Settings — the master enable switch, app paths, and a permission re-check.
 * Everything here writes straight through to the persisted config.
 */

export interface SettingsPageProps {
  config: AppConfig
  onEnabledChange: (enabled: boolean) => void
  onSetInputBackend: (backend: 'sdl' | 'hid') => void
  onPickPath: (kind: 'claudeDesktop' | 'terminal') => Promise<void>
}

export function SettingsPage({
  config,
  onEnabledChange,
  onSetInputBackend,
  onPickPath
}: SettingsPageProps): JSX.Element {
  const [perms, setPerms] = useState<PermissionStatus | null>(null)
  const [checking, setChecking] = useState(false)

  const checkPermissions = async (): Promise<void> => {
    setChecking(true)
    try {
      setPerms(await window.claudepad.checkPermissions())
    } finally {
      setChecking(false)
    }
  }

  useEffect(() => {
    void checkPermissions()
  }, [])

  const isMac = perms?.platform === 'darwin'
  const needsAccessibility = isMac && perms !== null && !perms.accessibility

  const PathRow = ({
    kind,
    label,
    value
  }: {
    kind: 'claudeDesktop' | 'terminal'
    label: string
    value?: string
  }): JSX.Element => (
    <Group justify="space-between" wrap="nowrap" align="center">
      <Stack gap={2} style={{ minWidth: 0, flex: 1 }}>
        <Text size="sm" fw={600}>
          {label}
        </Text>
        {value ? (
          <Code style={{ wordBreak: 'break-all' }}>{value}</Code>
        ) : (
          <Text size="xs" c="dimmed">
            Not set
          </Text>
        )}
      </Stack>
      <Button variant="light" size="xs" onClick={() => void onPickPath(kind)}>
        {value ? 'Change…' : 'Choose…'}
      </Button>
    </Group>
  )

  return (
    <Stack gap="lg">
      <Stack gap={2}>
        <Title order={2}>Settings</Title>
        <Text c="dimmed" size="sm">
          Master switch, app paths, and permissions.
        </Text>
      </Stack>

      {/* Master switch */}
      <Card withBorder padding="lg">
        <Group justify="space-between" align="center">
          <Stack gap={2}>
            <Title order={4}>Mapping</Title>
            <Text size="sm" c="dimmed">
              When off, ClaudePad emits nothing — a global kill switch.
            </Text>
          </Stack>
          <Switch
            checked={config.enabled}
            onChange={(e) => onEnabledChange(e.currentTarget.checked)}
            size="lg"
            color="clay"
            label={config.enabled ? 'On' : 'Off'}
          />
        </Group>
      </Card>

      {/* Controller input backend */}
      <Card withBorder padding="lg">
        <Stack gap="md">
          <Group justify="space-between" align="center">
            <Stack gap={2}>
              <Title order={4}>Controller input</Title>
              <Text size="sm" c="dimmed">
                How ClaudePad reads the pad. Turn on to use the DS4 <b>touchpad</b> as a trackpad.
              </Text>
            </Stack>
            <Switch
              checked={config.inputBackend === 'hid'}
              onChange={(e) => onSetInputBackend(e.currentTarget.checked ? 'hid' : 'sdl')}
              size="lg"
              color="clay"
              label={config.inputBackend === 'hid' ? 'HID (touchpad)' : 'SDL (default)'}
            />
          </Group>
          {config.inputBackend === 'hid' && (
            <Alert color="blue" variant="light" title="Touchpad reader active">
              <Text size="sm">
                The <b>left stick</b> and the <b>touchpad</b> now both move the cursor. For the
                touchpad you may be prompted for <b>Input Monitoring</b> (System Settings → Privacy
                &amp; Security) — grant it, then re-arm. If the controller stops responding, switch
                back to <b>SDL</b>.
              </Text>
            </Alert>
          )}
        </Stack>
      </Card>

      {/* App paths */}
      <Card withBorder padding="lg">
        <Stack gap="md">
          <Title order={4}>App paths</Title>
          <Text size="sm" c="dimmed">
            Used by the &quot;Launch&quot; actions to open the right app.
          </Text>
          <PathRow kind="claudeDesktop" label="Claude Desktop" value={config.paths.claudeDesktop} />
          <PathRow kind="terminal" label="Terminal" value={config.paths.terminal} />
        </Stack>
      </Card>

      {/* Permissions */}
      <Card withBorder padding="lg">
        <Stack gap="md">
          <Group justify="space-between">
            <Title order={4}>Permissions</Title>
            <Button
              variant="subtle"
              size="xs"
              loading={checking}
              onClick={() => void checkPermissions()}
            >
              Re-check
            </Button>
          </Group>

          {checking && !perms && (
            <Group gap="xs">
              <Loader size="xs" />
              <Text size="sm" c="dimmed">
                Checking…
              </Text>
            </Group>
          )}

          {perms && !isMac && (
            <Alert color="green" variant="light">
              No extra permission required on {perms.platform}.
            </Alert>
          )}

          {perms && isMac && perms.accessibility && (
            <Group gap="xs">
              <Badge color="green" variant="light">
                Accessibility granted
              </Badge>
              <Text size="sm" c="dimmed">
                ClaudePad can control input.
              </Text>
            </Group>
          )}

          {needsAccessibility && (
            <Alert color="yellow" variant="light" title="Accessibility not granted">
              <Stack gap="sm">
                <Text size="sm">
                  ClaudePad can&apos;t send keystrokes until you enable it under
                  Privacy &amp; Security → Accessibility.
                </Text>
                <Group>
                  <Button
                    variant="light"
                    onClick={() => window.claudepad.openAccessibilitySettings()}
                  >
                    Open Accessibility Settings
                  </Button>
                  <Button variant="subtle" loading={checking} onClick={() => void checkPermissions()}>
                    Re-check
                  </Button>
                </Group>
              </Stack>
            </Alert>
          )}
        </Stack>
      </Card>
    </Stack>
  )
}
