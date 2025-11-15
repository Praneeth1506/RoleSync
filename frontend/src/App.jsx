import { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/vite.svg'
//import './App.css'
import {BrowserRouter,Routes,Route} from 'react-router-dom'
import FileUpload from './components/fileupload'
import Navbar from './components/navbar'
import Feedback from './components/feedback'
function App() {

  return (
    <>
      <BrowserRouter>
      <Navbar/>
          <Routes>
            
            <Route path="/" element={<FileUpload/>}/>
            <Route path="/feedback" element={<Feedback/>}/>
          </Routes>
      </BrowserRouter>

    </>
  )
}

export default App
