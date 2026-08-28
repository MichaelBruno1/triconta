import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import GroupPage from './pages/GroupPage';
import AddExpensePage from './pages/AddExpensePage';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="groups/:groupId" element={<GroupPage />} />
        <Route path="groups/:groupId/expenses/new" element={<AddExpensePage />} />
        <Route path="groups/:groupId/expenses/:expenseId/edit" element={<AddExpensePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
