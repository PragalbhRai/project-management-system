import { ApiClient, ApiError } from '../packages/api-client/dist/index.js';

async function runVerification() {
  console.log('=== Starting E2E Verification ===\n');

  let currentToken = null;
  const client = new ApiClient({
    baseUrl: 'http://localhost:3000',
    getToken: () => currentToken,
  });

  // 1. Register
  const testEmail = `user_${Date.now()}@test.io`;
  console.log(`1. Testing Register with email: ${testEmail}`);
  const regRes = await client.auth.register({
    fullName: 'Jane Developer',
    email: testEmail,
    password: 'Password123!',
  });
  console.log('   ✓ Registered successfully:', regRes.user.email);
  if (!regRes.accessToken) throw new Error('No access token returned from register');

  // 2. Login
  console.log('2. Testing Login');
  const loginRes = await client.auth.login({
    email: testEmail,
    password: 'Password123!',
  });
  console.log('   ✓ Logged in successfully. Token acquired.');
  currentToken = loginRes.accessToken;

  // Verify auth/me
  const me = await client.auth.me();
  console.log('   ✓ auth.me returned:', me.fullName, me.email);

  // 3. Initial Dashboard
  console.log('3. Testing Dashboard loads initial state');
  const initialDash = await client.dashboard.get();
  console.log('   ✓ Initial stats:', initialDash);
  if (initialDash.totalProjects !== 0 || initialDash.totalTasks !== 0) {
    throw new Error('Initial dashboard should have 0 projects and tasks');
  }

  // 4. Create Project
  console.log('4. Testing Create Project');
  const project = await client.projects.create({
    name: 'Frontend Design System',
    description: 'Component library and tokens',
    status: 'IN_PROGRESS',
    startDate: new Date('2026-10-01').toISOString(),
    endDate: new Date('2026-10-31').toISOString(),
  });
  console.log('   ✓ Created project:', project.name, `[ID: ${project.id}]`);

  // 5. Edit Project
  console.log('5. Testing Edit Project');
  const updatedProject = await client.projects.update(project.id, {
    name: 'Frontend Design System v2',
    description: 'Updated tokens and animations',
    status: 'IN_PROGRESS',
  });
  console.log('   ✓ Updated project:', updatedProject.name, updatedProject.description);
  if (updatedProject.name !== 'Frontend Design System v2') throw new Error('Update failed');

  // 6. Create Task 1 & 2
  console.log('6. Testing Create Task');
  const task1 = await client.tasks.create({
    projectId: project.id,
    name: 'Design Buttons and Inputs',
    description: 'Create reusable variants',
    priority: 'HIGH',
    status: 'PENDING',
    dueDate: new Date('2026-10-15').toISOString(),
  });
  console.log('   ✓ Created task 1:', task1.name, `[Priority: ${task1.priority}]`);

  const task2 = await client.tasks.create({
    projectId: project.id,
    name: 'Setup Vitest and React Testing',
    priority: 'MEDIUM',
    status: 'PENDING',
  });
  console.log('   ✓ Created task 2:', task2.name);

  // 7. Edit Task
  console.log('7. Testing Edit Task');
  const updatedTask2 = await client.tasks.update(task2.id, {
    name: 'Setup Vitest and Playwright',
    priority: 'LOW',
  });
  console.log('   ✓ Updated task 2:', updatedTask2.name, `[Priority: ${updatedTask2.priority}]`);
  if (updatedTask2.priority !== 'LOW') throw new Error('Task priority update failed');

  // 8. Mark Task Completed
  console.log('8. Testing Mark Task Completed');
  const completedTask1 = await client.tasks.update(task1.id, {
    status: 'COMPLETED',
  });
  console.log('   ✓ Completed task 1:', completedTask1.name, `[Status: ${completedTask1.status}]`);
  if (completedTask1.status !== 'COMPLETED') throw new Error('Task complete status failed');

  // 9. Search Project
  console.log('9. Testing Search Project');
  const searchResults = await client.projects.list({ search: 'Frontend Design' });
  console.log('   ✓ Search results count:', searchResults.length);
  if (searchResults.length !== 1) throw new Error('Search should find 1 project');

  // 10. Filter Project
  console.log('10. Testing Filter Project');
  const inProgressProjects = await client.projects.list({ status: 'IN_PROGRESS' });
  console.log('   ✓ In progress count:', inProgressProjects.length);
  const completedProjects = await client.projects.list({ status: 'COMPLETED' });
  console.log('   ✓ Completed projects count:', completedProjects.length);
  if (inProgressProjects.length !== 1 || completedProjects.length !== 0) {
    throw new Error('Project status filtering failed');
  }

  // 11. Search Task
  console.log('11. Testing Search Task');
  const searchTaskResults = await client.tasks.list({ search: 'Vitest' });
  console.log('   ✓ Task search results count:', searchTaskResults.length);
  if (searchTaskResults.length !== 1) throw new Error('Task search failed');

  // 12. Filter Task
  console.log('12. Testing Filter Task by Status and Priority');
  const completedTasks = await client.tasks.list({ status: 'COMPLETED' });
  console.log('   ✓ Completed tasks count:', completedTasks.length);
  const pendingTasks = await client.tasks.list({ status: 'PENDING' });
  console.log('   ✓ Pending tasks count:', pendingTasks.length);
  const lowPriorityTasks = await client.tasks.list({ priority: 'LOW' });
  console.log('   ✓ Low priority tasks count:', lowPriorityTasks.length);
  if (completedTasks.length !== 1 || pendingTasks.length !== 1 || lowPriorityTasks.length !== 1) {
    throw new Error('Task filtering failed');
  }

  // 13. Dashboard Updates
  console.log('13. Testing Dashboard Updated Stats');
  const updatedDash = await client.dashboard.get();
  console.log('   ✓ Updated dashboard:', updatedDash);
  if (
    updatedDash.totalProjects !== 1 ||
    updatedDash.projectsInProgress !== 1 ||
    updatedDash.totalTasks !== 2 ||
    updatedDash.completedTasks !== 1 ||
    updatedDash.pendingTasks !== 1
  ) {
    throw new Error('Dashboard stats mismatch');
  }

  // 14. Logout
  console.log('14. Testing Logout');
  const logoutRes = await client.auth.logout();
  console.log('   ✓ Logged out:', logoutRes.message);

  // 15. Protected route with revoked token rejects (401)
  console.log('15. Testing Revoked Token Access');
  try {
    await client.projects.list();
    throw new Error('Revoked token should fail with 401');
  } catch (err) {
    if (err instanceof ApiError && err.statusCode === 401) {
      console.log('   ✓ Correctly rejected with 401 Unauthorized');
    } else {
      throw err;
    }
  }

  // 16. Unauthenticated / Invalid token rejects
  console.log('16. Testing Invalid Token Access');
  currentToken = 'invalid-token-format';
  try {
    await client.dashboard.get();
    throw new Error('Invalid token should fail with 401');
  } catch (err) {
    if (err instanceof ApiError && err.statusCode === 401) {
      console.log('   ✓ Correctly rejected with 401 Unauthorized [Request ID:', err.requestId, ']');
    } else {
      throw err;
    }
  }

  console.log('\n=== ALL 16 VERIFICATION CRITERIA PASSED ===');
}

runVerification().catch((err) => {
  console.error('Verification failed:', err);
  process.exit(1);
});
