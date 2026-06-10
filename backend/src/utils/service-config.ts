const placeholderValues = new Set([
  "pendiente",
  "temporal",
  "example_user",
  "example_password",
  "example_account_id",
  "example_access_key_id",
  "example_secret_access_key",
  "smtp.example.com",
]);

export function isConfiguredValue(value: string | undefined) {
  if (!value) {
    return false;
  }

  const normalized = value.trim().replace(/^["']|["']$/g, "").toLowerCase();
  return normalized.length > 0 && !placeholderValues.has(normalized);
}

export function cleanConfigValue(value: string) {
  return value.trim().replace(/^["']|["']$/g, "");
}

export function getConfiguredValue(value: string | undefined) {
  if (!isConfiguredValue(value)) {
    return null;
  }

  return cleanConfigValue(value ?? "");
}

export function isConfiguredRedisUrl(value: string | undefined) {
  const cleanValue = getConfiguredValue(value);

  if (!cleanValue) {
    return false;
  }

  try {
    const redisUrl = new URL(cleanValue);
    return isConfiguredValue(redisUrl.hostname);
  } catch {
    return false;
  }
}
