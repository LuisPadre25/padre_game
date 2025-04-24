import { createBrowserRouter } from 'react-router-dom';
import CreateGame from './components/game/CreateGame';

export const createGameRouter = createBrowserRouter([
  {
    path: '/',
    element: <CreateGame />
  }
]); 