import React, { useEffect, useState } from 'react';
import styles from "./header.module.scss";
import Link from 'next/link';
import Image from 'next/image';
import mainLogo from "../../assets/logo.png"
import Navbar from './NavBar/Navbar';
import { HiOutlineMenuAlt3 } from 'react-icons/hi';
import RightSideBar from '@/HomeModule/Component/RightSideBar/RightSideBar';
import ResponsiveNavBar from './ResponsiveNavBar/ResponsiveNavBar';

const MainHeader = () => {
  const [sidebar,setSideBar] = useState(false)
  const [responsiveNavBar,setResponsiveNavBar] = useState(false)
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      setScrollY(window.scrollY);
    };
    handleScroll();

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);
  const showSideBar = () =>{
    setSideBar(true)
  }
  useEffect(() => {
    if (responsiveNavBar) {
      document.body.style.overflow = "hidden";
      document.body.style.maxHeight = "100vh";
      // document.body.style.paddingRight = "15px";
    }
    return () => {
      document.body.style.overflow = "unset";
      document.body.style.maxHeight = "auto";

      // document.body.style.paddingRight = "0px";
    };
  }, [responsiveNavBar]);
  return (
    <>
      <header className={`${styles.header} ${scrollY && styles.sticky}`}>
        <Link href={"/"} className={styles.logoContainer}>
          <div className={styles.logoWrapper}>
            <Image src={mainLogo} alt="logo-image" />
          </div>
          <p className={styles.logoText}>BABA SAAB EVENTS</p>
        </Link>
        {/* === desktop Navbar === */}
        <Navbar className={styles.navView} />
        {/* === contact Btn === */}
        <button
          className={styles.contactBtn}
          onClick={() => window.open("/contact", "_self")}
        >
          Contact
        </button>
        <button className={styles.menuIcon} onClick={showSideBar}>
          <HiOutlineMenuAlt3 />
        </button>
      </header>
      {/* === responsive header start == */}
      <div className={styles?.responsiveHeader}>
        <Link href={"/"} className={styles.logoContainer}>
          <div className={styles.logoWrapper}>
            <Image src={mainLogo} alt="logo-image" />
          </div>
        </Link>
        <button
          className={styles.menuIcon}
          onClick={() => setResponsiveNavBar(!responsiveNavBar)}
        >
          <HiOutlineMenuAlt3 />
        </button>
        {/* === overlay start === */}
        <div
          className={`${styles.overlay} ${
            responsiveNavBar && styles.activeOverlay
          }`}
          onClick={() => {
            setResponsiveNavBar(false);
          }}
        ></div>
        {/* === overlay end === */}
      </div>

      <RightSideBar setSideBar={setSideBar} sidebar={sidebar} />
      <ResponsiveNavBar
        responsiveNavBar={responsiveNavBar}
        setResponsiveNavBar={setResponsiveNavBar}
      />
      {/* === responsive header end == */}
    </>
  );
}

export default MainHeader
