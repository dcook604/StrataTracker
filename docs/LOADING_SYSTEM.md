# Global Loading System Documentation

## Overview

The StrataTracker application now includes a comprehensive global loading system that provides consistent loading states and spinners across the entire application. This system uses React Context to manage loading states and provides reusable components for different loading scenarios.

## Architecture

### Core Components

1. **LoadingContext** (`client/src/contexts/loading-context.tsx`)
   - Manages global loading states
   - Provides hooks for async operations
   - Tracks multiple concurrent loading operations

2. **LoadingSpinner Components** (`client/src/components/ui/loading-spinner.tsx`)
   - Reusable spinner components
   - Multiple variants (default, overlay, inline)
   - Consistent styling and behavior

3. **GlobalLoadingOverlay** (`client/src/components/global-loading-overlay.tsx`)
   - Shows overlay when any loading operation is active
   - Automatically displays appropriate messages

## Usage

### Basic Setup

The loading system is already integrated into the main App component:

```tsx
// App.tsx
<LoadingProvider>
  <AuthProvider>
    {/* Your app content */}
    <GlobalLoadingOverlay />
  </AuthProvider>
</LoadingProvider>
```

### Using the Loading System

#### 1. For Async Operations (Recommended)

```tsx
import { useAsyncLoading } from "@/contexts/loading-context";
import { ButtonLoading } from "@/components/ui/loading-spinner";

function MyComponent() {
  const saveLoading = useAsyncLoading('my-save-operation');

  const handleSave = async () => {
    await saveLoading.executeWithLoading(
      () => apiRequest("POST", "/api/save", data),
      "Saving your changes..."
    );
  };

  return (
    <Button 
      onClick={handleSave} 
      disabled={saveLoading.isLoading}
    >
      {saveLoading.isLoading ? (
        <ButtonLoading message="Saving..." showMessage={true} />
      ) : (
        "Save"
      )}
    </Button>
  );
}
```

#### 2. Manual Loading Control

```tsx
import { useLoading } from "@/contexts/loading-context";

function MyComponent() {
  const { setLoading, isLoading } = useLoading();

  const handleAction = async () => {
    setLoading('my-action', true, 'Processing...');
    try {
      await someAsyncOperation();
    } finally {
      setLoading('my-action', false);
    }
  };

  return (
    <Button 
      onClick={handleAction} 
      disabled={isLoading('my-action')}
    >
      {isLoading('my-action') ? 'Processing...' : 'Start Action'}
    </Button>
  );
}
```

### Loading Spinner Components

#### ButtonLoading
For buttons with loading states:

```tsx
import { ButtonLoading } from "@/components/ui/loading-spinner";

<Button disabled={isLoading}>
  {isLoading ? (
    <ButtonLoading message="Saving..." showMessage={true} />
  ) : (
    "Save"
  )}
</Button>
```

#### PageLoading
For full page loading states:

```tsx
import { PageLoading } from "@/components/ui/loading-spinner";

if (isLoading) {
  return <PageLoading message="Loading data..." />;
}
```

#### OverlayLoading
For modal/overlay loading states:

```tsx
import { OverlayLoading } from "@/components/ui/loading-spinner";

{showOverlay && <OverlayLoading message="Processing..." />}
```

#### Custom LoadingSpinner
For custom implementations:

```tsx
import { LoadingSpinner } from "@/components/ui/loading-spinner";

<LoadingSpinner 
  size="lg" 
  message="Custom loading..." 
  variant="inline"
  showMessage={true}
/>
```

## Loading Keys Convention

Use descriptive, hierarchical keys for loading operations:

- `settings-email-save` - Saving email settings
- `settings-smtp-save` - Saving SMTP configuration
- `violation-create` - Creating a new violation
- `unit-edit-{unitId}` - Editing a specific unit
- `user-delete-{userId}` - Deleting a specific user

## Best Practices

### 1. Use Descriptive Loading Messages

```tsx
// ✅ Good
await saveLoading.executeWithLoading(
  () => updateSettings(data),
  "Saving email settings..."
);

// ❌ Avoid
await saveLoading.executeWithLoading(
  () => updateSettings(data),
  "Loading..."
);
```

### 2. Disable Interactive Elements During Loading

```tsx
// ✅ Good
<Button 
  disabled={saveLoading.isLoading}
  onClick={handleSave}
>
  {saveLoading.isLoading ? <ButtonLoading /> : "Save"}
</Button>

// ❌ Missing disabled state
<Button onClick={handleSave}>
  {saveLoading.isLoading ? <ButtonLoading /> : "Save"}
</Button>
```

### 3. Use Unique Keys for Concurrent Operations

```tsx
// ✅ Good - Different keys for different operations
const emailSaveLoading = useAsyncLoading('settings-email-save');
const smtpSaveLoading = useAsyncLoading('settings-smtp-save');

// ❌ Avoid - Same key for different operations
const saveLoading = useAsyncLoading('save');
```

### 4. Handle Errors Gracefully

```tsx
const handleSave = async () => {
  try {
    await saveLoading.executeWithLoading(
      () => apiRequest("POST", "/api/save", data),
      "Saving..."
    );
    toast({ title: "Success", description: "Saved successfully!" });
  } catch (error) {
    toast({ 
      title: "Error", 
      description: error.message,
      variant: "destructive" 
    });
  }
};
```

## Migration from Old Loading States

### Before (Local State)
```tsx
const [isLoading, setIsLoading] = useState(false);

const handleSave = async () => {
  setIsLoading(true);
  try {
    await apiCall();
  } finally {
    setIsLoading(false);
  }
};
```

### After (Global Loading System)
```tsx
const saveLoading = useAsyncLoading('my-save-operation');

const handleSave = async () => {
  await saveLoading.executeWithLoading(
    () => apiCall(),
    "Saving..."
  );
};
```

## API Reference

### useLoading()
Returns the loading context with full control:

```tsx
const {
  loadingStates,      // All current loading states
  setLoading,         // Set loading state manually
  clearLoading,       // Clear specific loading state
  clearAllLoading,    // Clear all loading states
  isLoading,          // Check if specific key is loading
  isAnyLoading,       // Check if any operation is loading
  getLoadingMessage   // Get message for specific key
} = useLoading();
```

### useAsyncLoading(key: string)
Returns utilities for a specific loading operation:

```tsx
const {
  executeWithLoading, // Execute async function with loading
  isLoading,          // Boolean loading state
  loadingMessage      // Current loading message
} = useAsyncLoading('my-operation');
```

## Examples in Codebase

See the Settings page (`client/src/pages/settings-page.tsx`) for a complete implementation example showing:

- Multiple concurrent loading operations
- Form submission with loading states
- Button loading indicators
- Error handling with loading states

## Troubleshooting

### Loading State Not Clearing
Ensure you're using unique keys and that async operations complete properly:

```tsx
// ✅ Good - executeWithLoading handles cleanup
await saveLoading.executeWithLoading(() => apiCall());

// ❌ Manual cleanup required
setLoading('key', true);
await apiCall();
setLoading('key', false); // Must remember to clear
```

### Multiple Loading States Conflicting
Use specific, unique keys for different operations:

```tsx
// ✅ Good
const emailLoading = useAsyncLoading('settings-email');
const smtpLoading = useAsyncLoading('settings-smtp');

// ❌ Conflicting
const loading1 = useAsyncLoading('settings');
const loading2 = useAsyncLoading('settings');
```

### Global Overlay Not Showing
Ensure the GlobalLoadingOverlay is included in your App component and that you're using the loading system correctly.

## Future Enhancements

- Progress indicators for long-running operations
- Queue management for multiple operations
- Loading state persistence across navigation
- Integration with React Query loading states 