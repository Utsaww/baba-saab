import React from 'react';
import styles from "./MainContactSection.module.scss";
import { MdOutlineMail } from "react-icons/md";
import { IoPhonePortraitOutline, IoLocationOutline } from "react-icons/io5";
import Link from 'next/link';
import Cape from "../../../assets/Cape.PNG";
import Image from 'next/image';

const MainContactSection = () => {
  return (
    <>
      <section className={styles?.MainContactSection}>
        <div className={styles?.mapWrapper}>
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3495.148354611131!2d78.75418227465711!3d28.83444287488466!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x390afb8d5cac1809%3A0x2f65eb7cd7f32ed3!2sBaba%20Saab%20Event%20Company!5e0!3m2!1sen!2sin!4v1692518538307!5m2!1sen!2sin"
            width="100%"
            className={styles?.map}
            height="400"
            style={{ border: 0 }}
            allowfullscreen=""
            loading="lazy"
            referrerpolicy="no-referrer-when-downgrade"
          ></iframe>
        </div>
        {/* ==== address cards start ==== */}
        <div className={styles?.infoWrapper}>
          <div className={styles?.infoCard}>
            <MdOutlineMail className={styles?.mailIcon} />
            <div className={styles?.infoContent}>
              <h4>Email Address</h4>
              <p>babasaabevents@gmail.com</p>
            </div>
          </div>
          {/* ==== 2nd card start === */}
          <div className={`${styles?.infoCard} ${styles.center}`}>
            <IoPhonePortraitOutline className={styles?.mailIcon} />
            <div className={styles?.infoContent}>
              <h4>Phone Numbers</h4>
              <p>
                Mobile :
                <Link href="tel:+91-941-239-0557">+91-941-239-0557</Link>
              </p>
              <p>
                TelePhone :
                <Link href="tel:+91-941-239-0557">+91-941-239-0557</Link>
              </p>
            </div>
          </div>
          {/*==== 2nd card end ====  */}
          {/* ==== 3rd card start === */}
          <div className={styles?.infoCard}>
            <IoLocationOutline className={styles?.mailIcon} />
            <div className={styles?.infoContent}>
              <h4>Location</h4>
              <p>Opp. Calton School, Line Par,Majhola Road, Moradabad</p>
            </div>
          </div>
          {/* ==== 3rd card end === */}
        </div>
        {/* ==== address cards end ==== */}
        {/* === contact form start ==== */}
        <div className={styles?.ContactFromWrapper}>
          <div className={styles?.contactContent}>
            <h6 className="text-[16px] font-semibold uppercase text-[#cda45e] mb-[16px]">
              Contact Us
            </h6>
            <h2 className="text-[40px] font-semibold text-[#000] leading-[50px] mb-[16px]">
              Get the Party Started
            </h2>
            <p className="text-[15px] font-normal text-[#8d8d8d]">
              Hey there! Ready to make your event dreams a reality? At Baba Saab
              Company, we're all about creating unforgettable experiences with a
              human touch. We can't wait to hear from you!
            </p>
            <form className={styles?.formWrapper}>
              <div className={styles?.formLabel}>
                <label>
                  Name<sup>*</sup>
                </label>
                <input type="text" placeholder="Your Name" />
              </div>
              <div className={styles?.formLabel}>
                <label>
                  Email<sup>*</sup>
                </label>
                <input type="email" placeholder="Your Email" />
              </div>
              <div className={styles?.formLabel}>
                <label>
                  Service<sup>*</sup>
                </label>
                <select>
                  <option selected>Select Service</option>
                  <option>Weddings</option>
                  <option>Corporate Events </option>
                  <option>Anniversaries</option>
                  <option>Private Party</option>
                  <option>Birthday Party </option>
                  <option>Children Party</option>
                </select>
              </div>
              <div className={styles?.formLabel}>
                <label>
                  Phone Number<sup>*</sup>
                </label>
                <input type="number" placeholder="Your Number" />
              </div>
              <div className={styles?.formLabel}>
                <label>Message</label>
                <textarea rows={4} placeholder="Your Message" />
              </div>
              <button className={styles.contactBtn}>Submit</button>
            </form>
          </div>
          <div className={styles?.imageWrapper}>
            <Image src={Cape} alt="partyImage" />
          </div>
        </div>
        {/* === contact form end ==== */}
      </section>
    </>
  );
}

export default MainContactSection
