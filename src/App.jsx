import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import VideoUpload from '../pages/VideoUpload'
import BackendStatus from './components/BackendStatus'

function App() {
  return (
    <Router>
      <BackendStatus />
      <Routes>
        <Route path="/" element={<VideoUpload />} />
      </Routes>
    </Router>
  )
}

export default App

