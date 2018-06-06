import React from 'react'

import Sidebar from '../components/Sidebar'
import './index.scss'

const Layout = ({ children }) => (
  <div className="container">
    <div className="columns is-gapless">
      <div className="column is-9 colLeft">{children()}</div>
      <div className="column colRight">
        <Sidebar />
      </div>
    </div>
  </div>
)

export default Layout
