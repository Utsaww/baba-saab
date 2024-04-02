import React from 'react';
import styles from "./RightSideBar.module.scss";
import { IoClose } from "react-icons/io5";
import {FiPhone} from "react-icons/fi";
import Link from 'next/link';
import mainLogo from "../../../assets/logo.png";
import Image from 'next/image';
import SocialMediaIcon from '@/CommonComponents/Footer/SocialMediaIcon/SocialMediaIcon';
import {LuHome} from "react-icons/lu";
import {HiOutlineMail} from "react-icons/hi";
import {
  BiLogoFacebook,
  BiLogoTwitter,
  BiLogoInstagram,
  BiLogoYoutube,
} from "react-icons/bi";


const RightSideBar = ({sidebar,setSideBar}) => {
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
    <>
      <section
        className={`${styles?.RightSideBar} ${sidebar && styles.showBar}`}
      >
        <div className={styles?.wrapper}>
          <button
            className={styles?.closeBtn}
            onClick={() => setSideBar(false)}
          >
            <IoClose />
          </button>
          <Link href={""} className={styles.logoContainer}>
            <div className={styles.logoWrapper}>
              <Image src={mainLogo} alt="logo-image" />
            </div>
            <p className={styles.logoText}>BABASAAB</p>
          </Link>
          <p className={styles.aboutText}>
            Baba Saab Event Co. has been the heart of the most happening and
            rocking corporate events, wedding events, birthday parties and other
            event projects. The Stage is set, the lights dim and its show time.
          </p>
          {/* === social media icon start === */}
          <SocialMediaIcon
            className={styles?.rightSocialIcon}
            SocialMedia={SocialMedia}
          />
          {/* === social media icon end === */}

          <ul className={styles?.callEmailWrapper}>
            <li className={styles?.callWrapper}>
              <LuHome />
              <p>Opp. Calton School, Line Par, Majhola Road, Moradabad</p>
            </li>
            <li className={styles?.callWrapper}>
              <FiPhone />
              <Link href={"tel: +91 0123456789"}>+91-941-239-0557</Link>
            </li>
            <li className={styles?.callWrapper}>
              <HiOutlineMail />
              <Link href={"emailto :"}>babasaabevents@gmail.com</Link>
            </li>
          </ul>
        </div>
      </section>
    </>
  );
}

export default RightSideBar
