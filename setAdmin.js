const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');

// Initialize Firebase Admin
try {
  const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: privateKey,
    }),
  });

  const db = getFirestore();
  const uid = 'uTdN2Oi9iHbV9Vz6CChnosg3SUN2';

  async function setAdmin() {
    try {
      // Get user email
      const userRecord = await getAuth().getUser(uid);
      
      await db.collection('users').doc(uid).set({
        email: userRecord.email,
        displayName: userRecord.displayName || 'Admin User',
        role: 'admin',
        createdAt: new Date().toISOString(),
      }, { merge: true });

      console.log(`Successfully set user ${uid} (${userRecord.email}) as admin in Firestore.`);
      process.exit(0);
    } catch (error) {
      console.error('Error setting admin:', error);
      process.exit(1);
    }
  }

  setAdmin();
} catch (error) {
  console.error("Initialization error:", error);
}
