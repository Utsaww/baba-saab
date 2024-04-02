import Image from 'next/image'
import styles from './page.module.css'
import HomePage from '@/HomeModule';
export const metadata = {
  title:
    "Corporate Events | Wedding Planners | Event Management | Birthdays | Wedding Anniversary Celebrations & MORE",
  description:
    "Baba Saab Event Company - Your go-to for unforgettable corporate events, weddings, birthdays, and more. We make every moment count. No dress rehearsal, no second chances. The stage is set, lights dimmed, it's showtime!",
  keywords: [
      "event planners near me",
      "event companies in delhi",
      "wedding planners near me",
      "birthday celebration places near me",
      "birthday celebration places in delhi",
      "event management near me",
      "event management companies in delhi",
      "event management companies near me",
      "event planners near me",
      "birthday items list",
      "birthday party organisers",
      "birthday planner near me",
      "party planner",
      "Ghaziabad", "Noida", "Delhi", "Nanital", "Ramanagar", "Jim Corbett", "Moradabad", "Rampur", "Amroha", "Kashipur", "Haldwani", "Rudrapur", "Bareilly", "Bhimtal"
  ]

  }

export default function Home() {
  return <HomePage />;
}
