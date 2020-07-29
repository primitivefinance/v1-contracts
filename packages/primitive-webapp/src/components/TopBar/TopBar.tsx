import React from 'react'
import { Link } from 'react-router-dom'
import styled from 'styled-components'

import AccountCircleIcon from '@material-ui/icons/AccountCircle'
import NotificationsIcon from '@material-ui/icons/Notifications'

import Container from '../Container'
import IconButton from '../IconButton'
import Logo from '../Logo'

const TopBar: React.FC = () => {
    return (
        <StyledTopBar>
            <Container
                alignItems="center"
                display="flex"
                height={72}
            >
                <StyledFlex>
                    <Logo />
                </StyledFlex>
                <StyledNav>
                    <StyledNavItem to="/">Portfolio</StyledNavItem>
                    <StyledNavItem active={true} to="/">Markets</StyledNavItem>
                </StyledNav>
                <StyledFlex>
                    <StyledFlex />
                    <IconButton
                        onClick={() => {}}
                        variant="transparent"
                    >
                        <NotificationsIcon />
                    </IconButton>
                    <IconButton
                        onClick={() => {}}
                        variant="transparent"
                    >
                        <AccountCircleIcon />
                    </IconButton>
                </StyledFlex>
            </Container>
        </StyledTopBar>
    )
}

const StyledTopBar = styled.div`
  background-color: ${props => props.theme.color.black};
  border-bottom: 1px solid ${props => props.theme.color.grey[600]};
  color: ${props => props.theme.color.white};
  display: flex;
  height: 72px;
`

const StyledFlex = styled.div`
    align-items: center;
    display: flex;
    flex: 1;
`

const StyledNav = styled.div`
    display: flex;
    flex: 1;
    font-weight: 700;
    justify-content: center;
`

interface StyledNavItemProps {
    active?: boolean;
}

const StyledNavItem = styled(Link)<StyledNavItemProps>`
    color: ${props => props.active ? props.theme.color.white : props.theme.color.grey[400]};
    padding-left: ${props => props.theme.spacing[3]}px;
    padding-right: ${props => props.theme.spacing[3]}px;
    text-decoration: none;
    &:hover {
        color: ${props => props.theme.color.white};
    }
`

export default TopBar