'use client';
import React from 'react';
import styles from "./footer.module.scss";
import logo from "../../assets/logo.png";
import Image from 'next/image';
import Navbar from '../Header/NavBar/Navbar';
import SocialMediaIcon from './SocialMediaIcon/SocialMediaIcon';
import {
  BiLogoFacebook,
  BiLogoTwitter,
  BiLogoInstagram,
  BiLogoYoutube,
} from "react-icons/bi";
import FooterNavbar from './NavBar/FooterNavbar';


const Footer = () => {
   const SocialMedia = [
     {
       id: 1,
       link: " https://www.facebook.com/babasaabevents/",
       icon: <BiLogoFacebook />,
     },
     {
       id: 2,
       link: "https://twitter.com/BabaEvent",
       icon: <BiLogoTwitter />,
     },
     {
       id: 3,
       link: "https://www.instagram.com/babasaabevents/",
       icon: <BiLogoInstagram />,
     },
     {
       id: 4,
       link: "https://www.youtube.com/channel/UCxal0pDnEpZ9Jb0uSwLlF7w",
       icon: <BiLogoYoutube />,
     },
   ];
 
  return (
    <section className={styles?.Footer}>
      <div className={styles?.footerContent}>
        <Image src={logo} alt="main-logo" />
        <FooterNavbar className={styles?.footerNavbar} />
        {/* ==== social icons start ===== */}
        <SocialMediaIcon SocialMedia={SocialMedia} />
        {/* ==== social icons end ===== */}
        {/* =====copy write section start =====  */}
        <div className={styles?.copyRight}>
          <p>
            © Copyright <strong>BABA SAAB EVENTS.</strong> All Rights Reserved
          </p>
        </div>
        {/* =====copy write section end =====  */}
      </div>
    </section>
  );
}

export default Footer
