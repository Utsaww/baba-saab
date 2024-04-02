import React from 'react';
import styles from "./ourTeamSection.module.scss";
import Image from 'next/image';
import {
  BiLogoFacebook,
  BiLogoTwitter,
  BiLogoInstagram,
  BiLogoYoutube,
} from "react-icons/bi";
import SocialMediaIcon from '@/CommonComponents/Footer/SocialMediaIcon/SocialMediaIcon';

const OurTeam = () => {
      const SocialMedia = [
        {
          id: 1,
          link: "/",
          icon: <BiLogoFacebook />,
        },
        {
          id: 2,
          link: "/",
          icon: <BiLogoTwitter />,
        },
        {
          id: 3,
          link: "/",
          icon: <BiLogoInstagram />,
        },
        {
          id: 4,
          link: "/",
          icon: <BiLogoYoutube />,
        },
      ];
  return (
    <>
      <section className={styles?.ourTeam}>
        <h6 className="text-[16px] font-semibold uppercase text-[#cda45e] text-center">
          Our Team
        </h6>
        <h2 className="text-[40px] font-semibold leading-[50px] mb-[25px] text-black text-center mt-[15px]">
          People working With Us
        </h2>
        <div className={styles?.ourTeamWrapper}>
          <div className={styles?.cardWrapper}>
            <div className={styles?.imageWrapper}>
              <Image
                src={
                  "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1374&q=80"
                }
                alt="image 1"
                fill={"fill"}
              />
            </div>
            <div className={styles?.cardContent}>
              <h6 className="text-[#cda45e] text-[18px] font-semibold">
                Event Planner
              </h6>
              <h3 className="text-white text-[28px] font-semibold mt-[5px] mb-[15px]">
                Roberts Joy
              </h3>
              <SocialMediaIcon SocialMedia={SocialMedia} />
            </div>
          </div>
          {/* === 2nd card start === */}

          <div className={styles?.cardWrapper}>
            <div className={styles?.imageWrapper}>
              <Image
                src={
                  "https://images.unsplash.com/photo-1562788869-4ed32648eb72?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=872&q=80"
                }
                alt="image 1"
                fill={"fill"}
              />
            </div>
            <div className={styles?.cardContent}>
              <h6 className="text-[#cda45e] text-[18px] font-semibold">
                Event Planner
              </h6>
              <h3 className="text-white text-[28px] font-semibold mt-[5px] mb-[15px]">
                Roberts Joy
              </h3>
              <SocialMediaIcon SocialMedia={SocialMedia} />
            </div>
          </div>
          {/* ==== 2nd card end ==== */}
          {/* === 3rd card start === */}
          <div className={styles?.cardWrapper}>
            <div className={styles?.imageWrapper}>
              <Image
                src={
                  "https://images.unsplash.com/photo-1607746882042-944635dfe10e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=870&q=80"
                }
                alt="image 1"
                fill={"fill"}
              />
            </div>
            <div className={styles?.cardContent}>
              <h6 className="text-[#cda45e] text-[18px] font-semibold">
                Event Planner
              </h6>
              <h3 className="text-white text-[28px] font-semibold mt-[5px] mb-[15px]">
                Roberts Joy
              </h3>
              <SocialMediaIcon SocialMedia={SocialMedia} />
            </div>
          </div>
          {/* ==== 3rd card end ==== */}
        </div>
      </section>
    </>
  );
}

export default OurTeam
