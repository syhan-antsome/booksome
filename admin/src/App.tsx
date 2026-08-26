import { Route } from 'react-router-dom';
import { Admin, CustomRoutes, Resource } from 'react-admin';

import { authProvider } from './authProvider';
import { dataProvider } from './dataProvider';
import { BooksomeLayout, resourceIcons } from './layout/BooksomeLayout';
import { Dashboard } from './pages/Dashboard';
import { LoginPage } from './pages/LoginPage';
import { SystemPage } from './pages/SystemPage';
import { BookList } from './resources/books';
import { ListingList } from './resources/listings';
import { PostList } from './resources/posts';
import { ReportList } from './resources/reports';
import { RoomList } from './resources/rooms';
import { UserList } from './resources/users';
import { booksomeTheme } from './theme';

export default function App() {
  return (
    <Admin
      authProvider={authProvider}
      dataProvider={dataProvider}
      dashboard={Dashboard}
      layout={BooksomeLayout}
      loginPage={LoginPage}
      theme={booksomeTheme}
      requireAuth
      disableTelemetry
      title="BookSome Admin"
    >
      <Resource name="users" list={UserList} icon={resourceIcons.users} options={{ label: '회원' }} />
      <Resource name="books" list={BookList} icon={resourceIcons.books} options={{ label: '도서' }} />
      <Resource name="rooms" list={RoomList} icon={resourceIcons.rooms} options={{ label: '북룸' }} />
      <Resource name="posts" list={PostList} icon={resourceIcons.posts} options={{ label: '게시물' }} />
      <Resource name="reports" list={ReportList} icon={resourceIcons.reports} options={{ label: '신고' }} />
      <Resource name="listings" list={ListingList} icon={resourceIcons.listings} options={{ label: '거래' }} />
      <CustomRoutes>
        <Route path="/system" element={<SystemPage />} />
      </CustomRoutes>
    </Admin>
  );
}
