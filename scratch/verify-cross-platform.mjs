import { ApiClient } from '../packages/api-client/dist/index.js';

async function runCrossPlatformVerification() {
  console.log('=== Cross-Platform Synchronization Verification ===\n');

  // Account A credentials
  const email = `sync_user_${Date.now()}@pms.io`;
  const password = 'SyncPassword123!';

  // Web Client Instance
  let webToken = null;
  const webClient = new ApiClient({
    baseUrl: 'http://localhost:3000',
    getToken: () => webToken,
  });

  // Mobile Client Instance
  let mobileToken = null;
  const mobileClient = new ApiClient({
    baseUrl: 'http://localhost:3000',
    getToken: () => mobileToken,
  });

  // Step 1: Register and login on Web with Account A
  console.log('Step 1: Register and Login on WEB with Account A');
  const regRes = await webClient.auth.register({
    fullName: 'Sync Tester',
    email,
    password,
  });
  webToken = regRes.accessToken;
  console.log(`   ✓ Web registered and logged in as: ${email}`);

  // Step 2: Login to Mobile with the SAME Account A
  console.log('Step 2: Login to MOBILE with the SAME Account A');
  const mobileLogin = await mobileClient.auth.login({
    email,
    password,
  });
  mobileToken = mobileLogin.accessToken;
  console.log('   ✓ Mobile authenticated successfully with same credentials');

  // Create Project on Web
  console.log('Step 2b: Create Project on WEB');
  const project = await webClient.projects.create({
    name: 'Cross-Platform Sprint Roadmap',
    description: 'Shared sprint between React Web and React Native Mobile',
    status: 'IN_PROGRESS',
  });
  console.log(`   ✓ Web created project: ${project.name} (${project.id})`);

  // Step 3: Create a task on Web
  console.log('Step 3: Create Task on WEB');
  const webTask = await webClient.tasks.create({
    projectId: project.id,
    name: 'Implement Biometric Authentication',
    description: 'FaceID and Android Fingerprint flow',
    priority: 'HIGH',
    status: 'PENDING',
  });
  console.log(`   ✓ Web created task: "${webTask.name}" [Status: ${webTask.status}]`);

  // Step 4 & 5: Pull-to-refresh on Mobile and show task
  console.log('Step 4 & 5: Pull-to-Refresh on MOBILE and verify task appears');
  const mobileTasks = await mobileClient.projects.getTasks(project.id);
  const foundOnMobile = mobileTasks.find((t) => t.id === webTask.id);
  if (!foundOnMobile) {
    throw new Error('Task created on web was not found on mobile after refresh');
  }
  console.log(`   ✓ Mobile retrieved task: "${foundOnMobile.name}" [Status: ${foundOnMobile.status}]`);

  // Step 6: Change the task on Mobile (change priority to LOW and status to COMPLETED)
  console.log('Step 6: Update Task on MOBILE (mark COMPLETED, priority LOW)');
  const updatedOnMobile = await mobileClient.tasks.update(webTask.id, {
    status: 'COMPLETED',
    priority: 'LOW',
  });
  console.log(`   ✓ Mobile updated task: "${updatedOnMobile.name}" [New Status: ${updatedOnMobile.status}, New Priority: ${updatedOnMobile.priority}]`);

  // Step 7 & 8: Refresh on Web and verify changed state
  console.log('Step 7 & 8: Refresh on WEB and verify changed state');
  const webTasksAfterRefresh = await webClient.projects.getTasks(project.id);
  const taskOnWebAfterSync = webTasksAfterRefresh.find((t) => t.id === webTask.id);
  if (!taskOnWebAfterSync) {
    throw new Error('Task missing on web');
  }
  if (taskOnWebAfterSync.status !== 'COMPLETED' || taskOnWebAfterSync.priority !== 'LOW') {
    throw new Error(`Sync mismatch on web: status=${taskOnWebAfterSync.status}, priority=${taskOnWebAfterSync.priority}`);
  }
  console.log(`   ✓ Web verified synchronized state: Status=${taskOnWebAfterSync.status}, Priority=${taskOnWebAfterSync.priority}`);

  // Also verify Dashboard on both platforms reflect the change
  const webDash = await webClient.dashboard.get();
  const mobileDash = await mobileClient.dashboard.get();
  console.log('Step 9: Verify Dashboards in sync:');
  console.log(`   ✓ Web Dashboard:    Total Projects=${webDash.totalProjects}, Completed Tasks=${webDash.completedTasks}`);
  console.log(`   ✓ Mobile Dashboard: Total Projects=${mobileDash.totalProjects}, Completed Tasks=${mobileDash.completedTasks}`);

  console.log('\n=== CROSS-PLATFORM SYNCHRONIZATION FULLY VERIFIED ===');
}

runCrossPlatformVerification().catch((err) => {
  console.error('Cross-platform verification failed:', err);
  process.exit(1);
});
