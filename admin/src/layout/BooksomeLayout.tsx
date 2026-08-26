import AutoStoriesOutlinedIcon from '@mui/icons-material/AutoStoriesOutlined';
import DashboardOutlinedIcon from '@mui/icons-material/DashboardOutlined';
import FlagOutlinedIcon from '@mui/icons-material/FlagOutlined';
import ForumOutlinedIcon from '@mui/icons-material/ForumOutlined';
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined';
import MenuBookOutlinedIcon from '@mui/icons-material/MenuBookOutlined';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import SettingsOutlinedIcon from '@mui/icons-material/SettingsOutlined';
import StorefrontOutlinedIcon from '@mui/icons-material/StorefrontOutlined';
import { Box, Button, Divider, Typography } from '@mui/material';
import type { ReactNode } from 'react';
import {
  AppBar,
  Layout,
  Menu,
  TitlePortal,
  useGetIdentity,
  useLogout,
  type LayoutProps,
} from 'react-admin';

const BooksomeAppBar = () => (
  <AppBar userMenu={false} toolbar={<></>}>
    <TitlePortal />
  </AppBar>
);

const BooksomeMenu = () => {
  const { identity } = useGetIdentity();
  const logout = useLogout();

  return (
    <Box sx={{ display: 'flex', minHeight: '100%', height: '100%', width: '100%', flexDirection: 'column', bgcolor: '#123c2b', color: '#eef4ef', py: 2 }}>
      <Box sx={{ px: 2.5, pb: 2.2, pt: 0.6 }}>
        <Typography sx={{ color: '#fff', fontSize: 20, fontWeight: 760, letterSpacing: '-0.04em' }}>
          BookSome <Box component="span" sx={{ color: '#e1a425' }}>Admin</Box>
        </Typography>
        <Typography sx={{ color: '#94aa9b', fontSize: 11.5, mt: 0.5 }}>서비스 운영 콘솔</Typography>
      </Box>

      <Menu sx={{ flex: 1, pt: 0.5 }}>
        <Menu.Item to="/" primaryText="대시보드" leftIcon={<DashboardOutlinedIcon />} />
        <Menu.ResourceItem name="users" />
        <Menu.ResourceItem name="books" />
        <Menu.ResourceItem name="rooms" />
        <Menu.ResourceItem name="posts" />
        <Menu.ResourceItem name="reports" />
        <Menu.ResourceItem name="listings" />
        <Menu.Item to="/system" primaryText="시스템" leftIcon={<SettingsOutlinedIcon />} />
      </Menu>

      <Box sx={{ px: 2 }}>
        <Divider sx={{ borderColor: 'rgba(255,255,255,0.12)', mb: 1.8 }} />
        <Typography sx={{ color: '#eef4ef', fontSize: 13, fontWeight: 650 }}>{identity?.fullName || '관리자'}</Typography>
        <Button
          color="inherit"
          onClick={() => logout()}
          startIcon={<LogoutOutlinedIcon />}
          sx={{ color: '#b8cabd', justifyContent: 'flex-start', mt: 0.5, px: 0, width: '100%' }}
        >
          로그아웃
        </Button>
      </Box>
    </Box>
  );
};

export const resourceIcons = {
  users: PeopleAltOutlinedIcon,
  books: MenuBookOutlinedIcon,
  rooms: AutoStoriesOutlinedIcon,
  posts: ForumOutlinedIcon,
  reports: FlagOutlinedIcon,
  listings: StorefrontOutlinedIcon,
};

export function BooksomeLayout({ children, ...props }: LayoutProps & { children?: ReactNode }) {
  return <Layout {...props} appBar={BooksomeAppBar} menu={BooksomeMenu}>{children}</Layout>;
}
