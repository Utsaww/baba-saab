import React from 'react';
import Link from 'next/link';
import styles from "./whatsAppIcon.module.scss";
import { BiLogoWhatsapp } from 'react-icons/bi';

const WhatsAppIcon = () => {
  return (
    <>
      <Link
        href={"https://wa.me/9412390557?text=Hi%20Baba%20Event%20Service"}
        target='_blank'
        className={styles?.WhatsAppIcon}
      >
        <BiLogoWhatsapp />
      </Link>
    </>
  );
}

export default WhatsAppIcon
