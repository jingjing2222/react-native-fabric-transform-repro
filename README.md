# React Native Android Fabric Transform Crash Repro

| As-is | To-be |
| --- | --- |
| ![Baseline Android Fabric transform crash repro](https://raw.githubusercontent.com/jingjing2222/react-native-fabric-transform-repro/main/crashed.gif) | ![Patched Android Fabric transform result](https://raw.githubusercontent.com/jingjing2222/react-native-fabric-transform-repro/main/patched.gif) |
| [crashed.gif](./crashed.gif) | [patched.gif](./patched.gif) |

This repository is the minimal reproduction and visual explanation for an
Android Fabric crash in React Native 0.85.3 when
`overrideBySynchronousMountPropsAtMountingAndroid` is enabled.

The GIFs above are provided for inline README preview. The as-is app crashes
after clearing a `transform` prop that was previously updated by Native
Animated. The to-be app applies the same repro flow with a patched React Native
runtime.

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

The patch changes the synchronous override merge behavior in
`SurfaceMountingManager.kt`.

When a regular Fabric props update contains a key that also exists in the stored
synchronous override map, and the incoming value is `null`, the patch treats it
as a real React prop removal:

- remove that key from the stored synchronous override map;
- keep the incoming `null` value in the Fabric props update;
- remove the per-tag override entry when all stored keys have been cleared.

The fix is generic for the current synchronous override map. It is not limited
to `transform`; it also preserves the same removal semantics for `opacity` and
future props stored by this path.

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
