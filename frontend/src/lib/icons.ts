'use client'

// Re-export lucide-react icons with a workaround for Turbopack HMR
// The issue occurs when modules are dynamically loaded via require.context
// By importing here first and then re-exporting, we ensure Turbopack tracks the module
// and prevents "module factory not available" errors during HMR updates

// Import the entire module to ensure it's in the bundle
import * as LucideIcons from 'lucide-react'

// Re-export commonly used icons - this ensures they're available even when dynamically loaded
export const Check = LucideIcons.Check
export const ChevronDown = LucideIcons.ChevronDown
export const ChevronUp = LucideIcons.ChevronUp
export const ChevronLeft = LucideIcons.ChevronLeft
export const ChevronRight = LucideIcons.ChevronRight
export const ChevronRightIcon = LucideIcons.ChevronRight
export const Circle = LucideIcons.Circle
export const X = LucideIcons.X
export const Search = LucideIcons.Search
export const Calendar = LucideIcons.Calendar
export const CalendarIcon = LucideIcons.Calendar
export const Image = LucideIcons.Image
export const Folder = LucideIcons.Folder
export const User = LucideIcons.User
export const Loader2 = LucideIcons.Loader2
export const Plus = LucideIcons.Plus
export const Edit = LucideIcons.Edit
export const Trash2 = LucideIcons.Trash2
export const Eye = LucideIcons.Eye
export const EyeOff = LucideIcons.EyeOff
export const Tag = LucideIcons.Tag
export const MapPin = LucideIcons.MapPin
export const Sun = LucideIcons.Sun
export const Moon = LucideIcons.Moon
export const Menu = LucideIcons.Menu
export const LogOut = LucideIcons.LogOut
export const Globe = LucideIcons.Globe
export const Camera = LucideIcons.Camera
export const Upload = LucideIcons.Upload
export const CheckCircle = LucideIcons.CheckCircle
export const XCircle = LucideIcons.XCircle
export const AlertCircle = LucideIcons.AlertCircle
export const Save = LucideIcons.Save
export const Star = LucideIcons.Star
export const StarOff = LucideIcons.StarOff
export const Palette = LucideIcons.Palette
export const Type = LucideIcons.Type
export const Layout = LucideIcons.Layout
export const Settings = LucideIcons.Settings
export const RotateCcw = LucideIcons.RotateCcw
export const ArrowLeft = LucideIcons.ArrowLeft
export const Home = LucideIcons.Home
export const Database = LucideIcons.Database
export const FolderOpen = LucideIcons.FolderOpen
export const Users = LucideIcons.Users
export const Map = LucideIcons.Map
export const UserCheck = LucideIcons.UserCheck
export const Users2 = LucideIcons.Users2
export const BarChart3 = LucideIcons.BarChart3
export const FileText = LucideIcons.FileText
export const Download = LucideIcons.Download
export const Github = LucideIcons.Github
export const Instagram = LucideIcons.Instagram
export const Twitter = LucideIcons.Twitter
export const Facebook = LucideIcons.Facebook
export const Linkedin = LucideIcons.Linkedin
export const Youtube = LucideIcons.Youtube
export const Filter = LucideIcons.Filter
