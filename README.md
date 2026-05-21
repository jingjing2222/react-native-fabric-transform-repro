# React Native Android Fabric Transform Crash Repro

| As-is | To-be |
| --- | --- |
| <img src="https://raw.githubusercontent.com/jingjing2222/react-native-fabric-transform-repro/main/crashed.gif" alt="Baseline Android Fabric transform crash repro" width="320" /> | <img src="https://raw.githubusercontent.com/jingjing2222/react-native-fabric-transform-repro/main/patched.gif" alt="Patched Android Fabric transform result" width="320" /> |
| [crashed.gif](./crashed.gif) | [patched.gif](./patched.gif) |

This repository is the minimal reproduction and visual explanation for an
Android Fabric crash in React Native 0.85.3 when
`overrideBySynchronousMountPropsAtMountingAndroid` is enabled.

The GIFs above are provided for inline README preview. The as-is app crashes
after clearing a `transform` prop that was previously updated by Native
Animated. The to-be app applies the same repro flow with a patched React Native
runtime and no longer crashes. Resetting the animated transform back to its
default position requires a separate Java Native Animated restore change.

## Crash Summary

Both apps enable `overrideBySynchronousMountPropsAtMountingAndroid` before the
React instance is created. This forces Android Fabric to use the synchronous
mount props override path for the repro.

The issue being demonstrated is a Fabric/Native Animated edge case:

1. `useNativeDriver: true` sends a native animated `transform` update through
   the direct manipulation path.
2. Android stores that synchronous `transform` override for the view tag.
3. React later sends a normal Fabric props update that removes `transform` from
   the same tag.
4. Fabric represents that removal as `transform: null`.
5. The Android synchronous override merge path still has the previous stored
   `transform` value and assumes the incoming value has the same non-null shape.

For `transform`, the stored Native Animated value is an array. The incoming
Fabric value is `null`, so the as-is app crashes while dispatching the mount
item:

```text
java.lang.AssertionError: Assertion failed
  at com.facebook.react.fabric.mounting.SurfaceMountingManager$Companion.overridePropsReadableMap
  at com.facebook.react.fabric.mounting.SurfaceMountingManager.updateProps
  at com.facebook.react.fabric.mounting.mountitems.IntBufferBatchMountItem.execute
```

## Patch Diff Summary

The patch focuses on the Android Fabric synchronous mount props override merge
path.

For a regular Fabric props update, `transform: null` or `opacity: null` can be a
stale commit that arrives after Native Animated has already applied a newer
synchronous value on the UI thread. In that path, the stored synchronous override
continues to win. The patch allows `ReadableType.Null` as an incoming value
shape for stored `transform` and `opacity` overrides, then writes the stored
Native Animated value back into the props update.

The stored override clear logic is scoped to `transform` / `opacity` only. If a
synchronous Native Animated path sends `transform: null` or `opacity: null`,
that prop is removed from the stored override map. Other `null` props are left
as-is because they may be meaningful view prop values.

This keeps the feature flag's original intent intact while avoiding generic
`null` removal:

- Regular Fabric update with `transform: null` or `opacity: null`: treat as a
  stale value shape and keep the stored Native Animated override.
- Synchronous Native Animated update with `transform: null` or `opacity: null`:
  treat as an explicit clear signal and remove the stored override for that prop.

The Java Native Animated `restoreDefaultValues()` implementation is intentionally
not included in this repro patch; it is planned as a separate React Native
change.

## Repro Apps

This repository contains two React Native CLI workspaces generated with React
Native `0.85.3`.

- `repro-crash`: as-is app that reproduces the crash.
- `repro-patched`: to-be app that applies a Yarn patch to `react-native@0.85.3`.

Both apps expose the same screen:

- `Start native transform`: starts a native-driver `transform` animation.
- `Clear transform`: removes the `transform` prop from the same view.

## Patch Layout

The Yarn patch lives here:

```text
repro-patched/.yarn/patches/react-native-npm-0.85.3-2292697f2f.patch
```

The patched app also uses a Gradle composite build so Android consumes the
patched React Native source from `node_modules` instead of the published Maven
AAR:

```text
com.facebook.react:react-android -> project(:packages:react-native:ReactAndroid)
com.facebook.react:hermes-android -> project(:packages:react-native:ReactAndroid:hermes-engine)
```

Without this substitution, the Yarn patch exists in `node_modules`, but the
installed Android app can still run against the unpatched `react-android` AAR.

## Environment

Yarn is configured for predictable `node_modules` installs:

```text
yarn 4.13.0
nodeLinker: node-modules
```

Both apps use Android New Architecture and Hermes:

```text
newArchEnabled=true
hermesEnabled=true
```

## Run

As-is:

```sh
cd repro-crash
yarn install
yarn android
```

To-be:

```sh
cd repro-patched
yarn install
yarn android
```

Clean Android rebuild for the patched app:

```sh
cd repro-patched/android
./gradlew --stop
rm -rf ../node_modules/react-native/ReactAndroid/build/prefab-headers
./gradlew --no-parallel :app:assembleDebug
```
