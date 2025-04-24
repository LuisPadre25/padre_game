import { createBrowserRouter } from 'react-router-dom';
import App from '../App';
import Chat from '../chat';
import WaitingRoom from '../waiting-room';
import CreateGame from '../create-game';

export const router = createBrowserRouter([
  {
    path: '/',
    element: <App />,
  },
  {
    path: '/chat',
    element: <Chat />,
  },
  {
    path: '/waiting-room',
    element: <WaitingRoom />,
  },
  {
    path: '/create-game',
    element: <CreateGame />,
  },
]); 