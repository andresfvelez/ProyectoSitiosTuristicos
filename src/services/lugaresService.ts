import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { LugarTuristico } from '../Components/models/LugarTuristico';

export const obtenerLugares = async (): Promise<LugarTuristico[]> => {
  const snapshot = await getDocs(collection(db, 'lugares_turisticos'));

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  })) as LugarTuristico[];
};
