# Model Settings Legacy Port Reference

Primary donor files:
- `/Users/zhangtiancheng/Documents/项目/新项目/Nion-release-v1.1.0/frontend/src/components/workspace/settings/model-settings-page.tsx`
- `/Users/zhangtiancheng/Documents/项目/新项目/Nion-release-v1.1.0/frontend/src/components/workspace/settings/configuration/sections/models-section.tsx`

Rationale:
- The old Nion version already has the interaction model the user wants validated in production.
- The port should preserve its UI structure and interaction logic as closely as possible.

Adaptation note:
- Renderer-side donor behavior is preserved.
- Persistence and runtime truth stay on current Nion `model-admin` / registry paths.
