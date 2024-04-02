'use client';
import React from 'react';
import styles from "./otherLinksSection.module.scss";
import Link from 'next/link';
import { usePathname } from "next/navigation";


const OtherLinksSection = ({ topService }) => {
  const pathname = usePathname();
  return (
    <>
      <ul className={styles?.rightTopService}>
        <p>Other Service</p>

        {topService.map((val) => {
          return (
            <>
              <li
                className={`${styles?.topServiceItem} ${
                  pathname == val?.routeLink && styles?.activeTopService
                }`}
                key={val?.routeName}
              >
                <Link href={val?.routeLink}>{val?.routeName}</Link>
              </li>
            </>
          );
        })}
      </ul>
    </>
  );
};

export default OtherLinksSection
