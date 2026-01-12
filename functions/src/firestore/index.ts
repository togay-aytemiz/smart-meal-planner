import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

export const getDb = () => {
  const existingDefault = getApps().find((app) => app.name === "[DEFAULT]");
  const app = existingDefault ?? initializeApp();

  return getFirestore(app);
};
