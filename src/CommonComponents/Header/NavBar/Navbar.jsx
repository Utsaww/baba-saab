'use client';
import React, { useState } from 'react';
import styles from "./navbar.module.scss";
import Link from 'next/link';
import { usePathname } from "next/navigation";

const Navbar = ({className}) => {
    const navData = [
      {
        id: 1,
        name: "HOME",
        route: "/",
        speed: "500",
      },
      {
        id: 2,
        name: "About",
        route: "/about",
        speed: "700",
      },
      {
        id: 3,
        name: "Service",
        route: "/service",
        speed: "900",
      },
      {
        id: 4,
        name: "gallery",
        route: "/gallery",
        speed: "1100",
      },
    ];
     const pathname = usePathname();
    const getId = (item) =>{
      console.log(item)
    }

  
   
  return (
    <nav className={`${styles.navbar} ${className}`}>
      <ul className={styles.navList}>
        {navData?.map((value)=>{
            return (
              <>
                <li
                  className={`${styles.navItem} ${pathname === value?.route && styles.activeNav}`}
                  key={value?.id}
                  onClick={() => getId(value?.id)}
                >
                  <Link
                    href={value?.route}
                    className={styles.navLink}
                  >
                    {value?.name}
                  </Link>
                </li>
              </>
            );
        })}
        
      </ul>
      
    </nav>
  );
}

export default Navbar
