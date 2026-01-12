import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

export const getDb = () => {
  if (getApps().length === 0) {
    initializeApp();
  }

  return getFirestore();
};
