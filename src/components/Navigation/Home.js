import React from 'react'
import Link from 'gatsby-link'
import PropTypes from 'prop-types'
import IconButton from '@material-ui/core/IconButton'
import HomeIcon from '@material-ui/icons/Home'

import styles from './styles.module.scss'

class NavigationHome extends React.Component {
  render() {
    return (
      <nav className={styles.home}>
        <IconButton component={Link} to="/" title="Home">
          <HomeIcon style={{ fontSize: 36 }} />
        </IconButton>
      </nav>
    )
  }
}

export default NavigationHome
