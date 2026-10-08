import { Route, Routes } from 'react-router-dom';
import AppLayout from './layouts/AppLayout';
import ProtectedRoute, { GuestRoute } from './components/ProtectedRoute';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';

import PatientDashboard from './pages/patient/PatientDashboard';
import PatientProfile from './pages/patient/PatientProfile';
import PatientDocuments from './pages/patient/PatientDocuments';
import PatientDocumentDetail from './pages/patient/PatientDocumentDetail';
import AIAssistantPage from './pages/patient/AIAssistantPage';
import DoctorSearchPage from './pages/patient/DoctorSearchPage';
import DoctorProfilePage from './pages/patient/DoctorProfilePage';
import PatientAppointments from './pages/patient/PatientAppointments';
import MedicalHistoryPage from './pages/patient/MedicalHistoryPage';
import PatientMessages from './pages/patient/PatientMessages';

import DoctorDashboard from './pages/doctor/DoctorDashboard';
import DoctorProfile from './pages/doctor/DoctorProfile';
import DoctorAppointments from './pages/doctor/DoctorAppointments';
import DoctorPatients from './pages/doctor/DoctorPatients';
import DoctorConsultations from './pages/doctor/DoctorConsultations';
import DoctorAIAssistant from './pages/doctor/DoctorAIAssistant';
import DoctorMessages from './pages/doctor/DoctorMessages';

import HospitalDashboard from './pages/hospital/HospitalDashboard';
import HospitalDoctors from './pages/hospital/HospitalDoctors';
import HospitalAppointments from './pages/hospital/HospitalAppointments';
import HospitalProfile from './pages/hospital/HospitalProfile';
import HospitalAIAssistant from './pages/hospital/HospitalAIAssistant';

import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminDoctors from './pages/admin/AdminDoctors';
import AdminHospitals from './pages/admin/AdminHospitals';
import AdminAppointments from './pages/admin/AdminAppointments';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />

      <Route
        path="/login"
        element={
          <GuestRoute>
            <LoginPage />
          </GuestRoute>
        }
      />
      <Route
        path="/register"
        element={
          <GuestRoute>
            <RegisterPage />
          </GuestRoute>
        }
      />

      {/* Patient */}
      <Route
        element={
          <ProtectedRoute roles={['patient']}>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/patient/dashboard" element={<PatientDashboard />} />
        <Route path="/patient/profile" element={<PatientProfile />} />
        <Route path="/patient/documents" element={<PatientDocuments />} />
        <Route path="/patient/documents/:id" element={<PatientDocumentDetail />} />
        <Route path="/patient/ai-assistant" element={<AIAssistantPage />} />
        <Route path="/patient/doctors" element={<DoctorSearchPage />} />
        <Route path="/patient/doctors/:id" element={<DoctorProfilePage />} />
        <Route path="/patient/appointments" element={<PatientAppointments />} />
        <Route path="/patient/medical-history" element={<MedicalHistoryPage />} />
        <Route path="/patient/messages" element={<PatientMessages />} />
      </Route>

      {/* Doctor */}
      <Route
        element={
          <ProtectedRoute roles={['doctor']}>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/doctor/dashboard" element={<DoctorDashboard />} />
        <Route path="/doctor/profile" element={<DoctorProfile />} />
        <Route path="/doctor/appointments" element={<DoctorAppointments />} />
        <Route path="/doctor/patients" element={<DoctorPatients />} />
        <Route path="/doctor/consultations" element={<DoctorConsultations />} />
        <Route path="/doctor/ai-assistant" element={<DoctorAIAssistant />} />
        <Route path="/doctor/messages" element={<DoctorMessages />} />
      </Route>

      {/* Hospital */}
      <Route
        element={
          <ProtectedRoute roles={['hospital']}>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/hospital/dashboard" element={<HospitalDashboard />} />
        <Route path="/hospital/doctors" element={<HospitalDoctors />} />
        <Route path="/hospital/appointments" element={<HospitalAppointments />} />
        <Route path="/hospital/profile" element={<HospitalProfile />} />
        <Route path="/hospital/ai-assistant" element={<HospitalAIAssistant />} />
      </Route>

      {/* Admin */}
      <Route
        element={
          <ProtectedRoute roles={['admin']}>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/admin/users" element={<AdminUsers />} />
        <Route path="/admin/doctors" element={<AdminDoctors />} />
        <Route path="/admin/hospitals" element={<AdminHospitals />} />
        <Route path="/admin/appointments" element={<AdminAppointments />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
