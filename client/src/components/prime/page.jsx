import React from 'react';
import PropTypes from 'prop-types';
import classNames from 'classnames';
import { withRouter } from 'react-router-dom';
import getWeb3 from '../getWeb3';

function Page({ 
  children, 
  location: {
    state,
  },
}) {
    const cx = classNames({
      page: true,
      'page--prev': state && state.prev,
    })
  return (
    <section 
      className={cx}
    >
      <div className="page__inner">
        {children}
      </div>
    </section>
  );
}

Page.propTypes = {
  children: PropTypes.node.isRequired,
};


export default withRouter(Page);