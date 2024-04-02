import React from 'react';
import styles from "./responsiveNavBar.module.scss";
import { IoClose } from "react-icons/io5";
import mainLogo from "../../../assets/logo.png";
import Link from 'next/link';
import Image from 'next/image';


const ResponsiveNavBar = ({ responsiveNavBar, setResponsiveNavBar }) => {
  const navData = [
    {
      id: 1,
      name: "HOME",
      route: "/",
    },
    {
      id: 2,
      name: "About",
      route: "/about",
    },
    {
      id: 3,
      name: "Service",
      route: "/service",
    },
    {
      id: 4,
      name: "gallery",
      route: "/gallery",
      speed: "1100",
    },
  ];
  return (
    <>
      <div
        className={`${styles?.responsiveNavBar} ${
          responsiveNavBar && styles?.show
        }`}
      >
        <div className={styles?.wrapper}>
          <button
            className={styles?.closeBtn}
            onClick={() => setResponsiveNavBar(false)}
          >
            <IoClose />
          </button>
          <Link href={"/"}
          onClick={() => setResponsiveNavBar(false)}
           className={styles.logoContainer}>
            <div className={styles.logoWrapper}>
              <Image src={mainLogo} alt="logo-image" />
            </div>
            <p className={styles.logoText}>BABA SAAB EVENTS</p>
          </Link>
          {/* === navbar start === */}
          <ul className={styles.navList}>
            {navData?.map((value) => {
              return (
                <>
                  <li
                    className={`${styles.navItem}`}
                    key={value?.id}
                    onClick={() => getId(value?.id)}
                  >
                    <Link
                      href={value?.route}
                      onClick={() => setResponsiveNavBar(false)}
                      className={styles.navLink}
                    >
                      {value?.name}
                    </Link>
                  </li>
                </>
              );
            })}
          </ul>
          {/* === navbar end === */}
          {/* === contact Btn start === */}
          <button
            className={styles.contactBtn}
            onClick={() => window.open("/contact", "_self")}
          >
            Contact
          </button>
          {/* === contact Btn end === */}
        </div>
      </div>
    </>
  );
};

export default ResponsiveNavBar
