### VPS Visibility and Linking Fix

Currently, VPS services are not consistently visible to clients in their dashboards, and linking servers to VPS services from the client details page is difficult. This plan addresses both issues.

#### User-facing changes
- **VPS Dashboard Visibility**: Ensures the "VPS Management" section is easily accessible from the client dashboard.
- **Improved Service Linking**: Adds a dedicated "Link VPS Instance" button to VPS-type services in the Admin Client Details page.
- **Clear Status**: Displays the linked VPS status clearly in the service list.

#### Technical details
- **Audit `services` schema**: Verify `product_type` is correctly assigned to VPS products.
- **Frontend (Admin)**: 
    - Modify `src/routes/_authenticated/admin/clients.$clientId.tsx` to detect `product_type === 'vps'`.
    - Add an action to open the VPS linking modal directly from the service row.
- **Frontend (Client)**:
    - Verify `src/routes/_authenticated/vps/index.tsx` logic for listing instances.
    - Ensure `AppShell` or `Dashboard` has a clear link to the VPS management area.
- **Server Functions**:
    - Ensure `getMyVPSInstances` in `src/lib/vps.functions.ts` handles all active services correctly.
