import { render, screen } from '@testing-library/react';
import TeacherStudentActions from '../src/components/teacher/TeacherStudentActions';

it('hides student actions without permissions', () => {
  const { container } = render(<TeacherStudentActions students={[]} courses={[]} permissions={{}} />);
  expect(container).toBeEmptyDOMElement();
});
it('only shows granted student actions', () => {
  render(<TeacherStudentActions students={[]} courses={[]} permissions={{ canCreateStudents: true }} />);
  expect(screen.getByRole('button', { name: 'Create Student' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Upload Students' })).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Delete Student' })).not.toBeInTheDocument();
});
it('bulk upload can be granted independently of single student creation', () => {
  render(<TeacherStudentActions students={[]} courses={[]} permissions={{ canBulkUpload: true }} />);
  expect(screen.getByRole('button', { name: 'Upload Students' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Create Student' })).not.toBeInTheDocument();
});
