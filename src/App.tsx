import headerLogo from './assets/global-header.png';
import './App.scss';
import { Button } from 'antd';
import './index.scss';

function App() {
  return (
    <>
      <div className="app">
        <h1 className="h1-style">Profiling AI Project</h1>
        <img src={headerLogo} className="logo" alt="Vite logo" />

        <Button type="primary">Test button</Button>
      </div>
    </>
  );
}

export default App;
