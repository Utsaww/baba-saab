import React from 'react';
import styles from "./homeContact.module.scss";
import Link from 'next/link';

const HomeContact = () => {
  return (
    <>
      <section className={styles.mainWrapper}>
        <div className={styles.headingWrapper}>
          <p className="text-[16px] font-semibold uppercase text-[#cda45e] text-center">
            Contact Us
          </p>
          <h2 className="text-[40px] font-semibold leading-[50px] mb-[25px] text-white mt-[15px]">
            After Celebrate Us
          </h2>
          <p className="text-[14px] text-white text-center tracking-[0.6px] font-[400]">
            Get in touch with us and let's turn your vision into an
            extraordinary event! Whether it's a vibrant party, a dream wedding,
            or a meticulously planned corporate gathering, our dedicated team is
            here to bring your ideas to life.
          </p>
          <p className="text-[14px] text-white text-center tracking-[0.6px] mt-[20px] font-[400]">
            Reach out for personalized event solutions, professional advice, and
            seamless coordination. We're committed to making your special
            moments truly unforgettable. Contact us today and let the planning
            begin!
          </p>
          <Link href="/contact">
            <button className={styles.contactBtn}>Contact Us</button>
          </Link>
        </div>
      </section>
    </>
  );
}

export default HomeContact
