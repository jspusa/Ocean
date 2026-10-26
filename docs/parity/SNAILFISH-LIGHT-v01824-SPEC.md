# 0.18.24 — hadal animal light and motion diagnosis

Status: local implementation and public release verified against 0.18.23 (`7b4961e`). No claim of complete commercial acceptance.

The user's realism and low-cost desktop/mobile requirements apply together. The
normal 0.18.23 hadal photograph shows a small pale snailfish whose surface detail
is difficult to read. Pinkish-white, translucent skin is biologically expected;
white appearance alone is not a rendering defect.

## Scope and accepted boundaries

Reuse the previously agreed normal-player UI, public `faunaGeometry`, and
Renderer → WebGL I/O seams. No new production diagnostic interface is required.
Normal exploration must retain automatic quality, real animal size, manual
mouse/touch selection and actual swimming; fixed renderer fixtures are separate
diagnostics and are never described as natural gameplay or physical-phone tests.

1. Capture the actual animal through normal navigation, native input and the
   existing camera controls at 0, −0.5 and −1 EV. Record position, distance,
   optics, framebuffer, quality/scale, float render-target support and actual
   subject batches. Preserve original JPEGs. Light is automatically on at depth;
   the lamp button cannot provide a deep lamp-off comparison.
2. Independently check swimming normals against finite differences of positions
   emitted by the actual colour/shadow vertex programs. Test body/tail and both
   pectoral lobes at multiple phases and both LODs. The output normal must remain
   perpendicular to the deformed tangent plane; no duplicated displacement
   formula is used as the oracle. Capture a failing baseline before a repair.
3. Select a local material change only if baseline images support it. Preserve
   natural pale skin, small eyes, divided pectoral lobes and tapered silhouette.
   Do not globally darken the sea, enlarge the fish, change its authored habitat,
   add emissive skin or hide cost through lower quality/content.
4. Check changed animal appearance using matched fixed-camera renders and normal
   UI photographs. Unaffected fauna/terrain are controls. Benchmark baseline and
   candidate in serialized native-GPU ABBA runs with fixed workload and retain
   signed raw results; render timing is not gameplay FPS or battery evidence.
5. Run affected regressions, final suite, independent Standards and Spec reviews.
   Publish the verified result and separately verify Pages commit, served hashes
   and public gameplay. Physical devices and full commercial parity stay open.

## Biological references

- Gerringer et al. (2017), original description, pp. 166–170:
  https://www.mapress.com/zt/article/download/zootaxa.4358.1.7/13080/13100
- University of Washington research team and in-situ footage:
  https://www.washington.edu/news/2017/11/28/theres-a-deeper-fish-in-the-sea/

The exposure bracket is an engineering diagnostic, not a biological colour
standard. Subpixel fin rays cannot be required to resolve at ordinary distance.

## Diagnostic decision

The normal 0.18.23 route and camera bracket succeeded at 7,001 m, with automatic
quality, scale 1, the high mesh drawn and `floatColor=true`. At 25° FOV and about
1.65 m, the 0 EV original already resolves small eyes, pale pink shading, divided
pectoral lobes and some fin rays. The −1 EV photograph has a different animal
yaw (about 0.415 rad), so it cannot isolate exposure from orientation. Neither
an RGBA8 failure nor an LOD failure is established by these images.

This release therefore repairs the independently reproducible swimming normals
only. It does not introduce an unmeasured tissue-return coefficient, change
albedo/lighting/tone mapping, or claim complete translucent-tissue realism.
The authored skin's limited tissue representation remains an open quality item.
Regression requires unchanged displacement equations and unchanged control-scene
pixels; only the snailfish's surface shading should change. Cross-version GPU
positions are checked within float32 precision, not required to be bit-identical. Baseline transform
feedback is valid only when its static controls pass and GL errors are zero.
